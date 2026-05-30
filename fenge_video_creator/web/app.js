const sourceType = document.querySelector('#sourceType');
const sourceContent = document.querySelector('#sourceContent');
const createPlanButton = document.querySelector('#createPlan');
const createJobButton = document.querySelector('#createJob');
const qualityMode = document.querySelector('#qualityMode');
const resolution = document.querySelector('#resolution');
const renderDuration = document.querySelector('#renderDuration');
const generateAudio = document.querySelector('#generateAudio');
const referenceImageFile = document.querySelector('#referenceImageFile');
const referenceImageUrl = document.querySelector('#referenceImageUrl');
const referencePreview = document.querySelector('#referencePreview');
const referencePreviewImage = document.querySelector('#referencePreviewImage');
const referenceUploadStatus = document.querySelector('#referenceUploadStatus');
const usePersonReference = document.querySelector('#usePersonReference');
const statusText = document.querySelector('#statusText');
const jobStatus = document.querySelector('#jobStatus');
const planTitleInput = document.querySelector('#planTitleInput');
const scriptOutput = document.querySelector('#scriptOutput');
const storyboardOutput = document.querySelector('#storyboardOutput');
const segmentsOutput = document.querySelector('#segmentsOutput');
const videoLink = document.querySelector('#videoLink');
const togglePills = document.querySelectorAll('.toggle-pill');

let currentProject = null;
let currentPlan = null;
let currentJob = null;
let currentAssets = [];
let pollTimer = null;

function getUserId() {
  const key = 'fenge_video_user_id';
  const current = localStorage.getItem(key);
  if (current) return current;
  const created = `user_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  localStorage.setItem(key, created);
  return created;
}

const userId = getUserId();

function refreshTogglePills() {
  for (const pill of togglePills) {
    const input = pill.querySelector('input');
    pill.classList.toggle('active', input?.checked === true);
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('图片读取失败'));
    reader.readAsDataURL(file);
  });
}

function escapeAttribute(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Video-User-Id': userId,
      ...(options.headers || {})
    }
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || '请求失败');
  }
  return data;
}

function renderPlan(plan) {
  planTitleInput.value = plan.title;
  scriptOutput.value = plan.script;
  storyboardOutput.innerHTML = '';

  for (const item of plan.storyboard) {
    const shot = document.createElement('article');
    shot.className = 'shot';
    shot.dataset.order = item.order;
    shot.innerHTML = `
      <strong>镜头 ${item.order} · ${item.durationSec} 秒</strong>
      <div class="shot-grid">
        <label>时长</label>
        <input class="shot-duration" type="number" min="1" max="20" value="${item.durationSec}">
        <label>口播</label>
        <textarea class="shot-narration" rows="3">${item.narration}</textarea>
        <label>画面提示词</label>
        <textarea class="shot-visual" rows="3">${item.visualPrompt}</textarea>
      </div>
    `;
    storyboardOutput.appendChild(shot);
  }
}

function collectEditedPlan() {
  const shots = [...storyboardOutput.querySelectorAll('.shot')].map((shot, index) => ({
    order: index + 1,
    durationSec: Number(shot.querySelector('.shot-duration').value || 5),
    narration: shot.querySelector('.shot-narration').value.trim(),
    visualPrompt: shot.querySelector('.shot-visual').value.trim()
  })).filter(item => item.narration && item.visualPrompt);

  return {
    ...currentPlan,
    title: planTitleInput.value.trim(),
    script: scriptOutput.value.trim(),
    storyboard: shots
  };
}

async function saveEditedPlan() {
  const editedPlan = collectEditedPlan();
  if (!editedPlan.title || !editedPlan.script || editedPlan.storyboard.length === 0) {
    throw new Error('请先完善标题、口播稿和分镜。');
  }

  const response = await requestJson(`/video/api/projects/${currentProject.id}/plan`, {
    method: 'PUT',
    body: JSON.stringify(editedPlan)
  });
  currentPlan = response.plan;
  return currentPlan;
}

async function createPlan() {
  createPlanButton.disabled = true;
  createJobButton.disabled = true;
  statusText.textContent = '正在生成视频方案';
  videoLink.hidden = true;
  jobStatus.textContent = '';

  try {
    const projectResponse = await requestJson('/video/api/projects', {
      method: 'POST',
      body: JSON.stringify({
        sourceType: sourceType.value,
        sourceContent: sourceContent.value,
        assets: currentAssets
      })
    });
    currentProject = projectResponse.project;

    const planResponse = await requestJson(`/video/api/projects/${currentProject.id}/plan`, {
      method: 'POST'
    });
    currentPlan = planResponse.plan;
    renderPlan(currentPlan);
    statusText.textContent = '视频方案已生成';
    createJobButton.disabled = false;
  } catch (error) {
    statusText.textContent = error.message;
  } finally {
    createPlanButton.disabled = false;
  }
}

async function pollJob() {
  if (!currentJob) return;

  const response = await requestJson(`/video/api/jobs/${currentJob.id}`);
  currentJob = response.job;
  jobStatus.textContent = `${currentJob.status} · ${currentJob.currentStep}`;
  renderSegments(currentJob.segments || []);

  if (currentJob.status === 'succeeded') {
    clearInterval(pollTimer);
    pollTimer = null;
    statusText.textContent = '全部分镜已完成';
    videoLink.hidden = true;
  }

  if (currentJob.status === 'failed') {
    clearInterval(pollTimer);
    pollTimer = null;
    statusText.textContent = currentJob.errorMessage || '生成失败';
  }
}

function renderSegments(segments) {
  segmentsOutput.innerHTML = '';
  for (const segment of segments) {
    const item = document.createElement('article');
    item.className = 'segment-item';
    const videoUrl = escapeAttribute(segment.videoUrl);
    const previewUrl = currentJob?.id && segment.id
      ? escapeAttribute(`/video/api/jobs/${currentJob.id}/segments/${segment.id}/media`)
      : videoUrl;
    const preview = videoUrl
      ? `
        <video class="segment-video" controls playsinline preload="metadata" src="${previewUrl}"></video>
        <div class="segment-actions">
          <a href="${videoUrl}" target="_blank" rel="noreferrer">打开原链接</a>
          <a href="${previewUrl}" download>下载视频</a>
          <button class="link-button copy-link" type="button" data-url="${videoUrl}">复制链接</button>
        </div>
      `
      : '';
    item.innerHTML = `
      <strong>第 ${segment.order} 段 · ${segment.status}</strong>
      <div>${segment.currentStep || ''}</div>
      ${preview}
    `;
    segmentsOutput.appendChild(item);
  }
}

async function createJob() {
  if (!currentProject || !currentPlan) return;

  createJobButton.disabled = true;
  statusText.textContent = '正在提交全部分镜任务';
  segmentsOutput.innerHTML = '';

  try {
    await saveEditedPlan();
    const response = await requestJson(`/video/api/projects/${currentProject.id}/jobs`, {
      method: 'POST',
      body: JSON.stringify({
        qualityMode: qualityMode.value,
        resolution: resolution.value,
        durationSec: Number(renderDuration.value),
        referenceImageUrl: referenceImageUrl.value.trim(),
        usePersonReference: usePersonReference.checked,
        generateAudio: generateAudio.checked
      })
    });
    currentJob = response.job;
    await pollJob();
    pollTimer = setInterval(pollJob, 1500);
  } catch (error) {
    statusText.textContent = error.message;
    createJobButton.disabled = false;
  }
}

createPlanButton.addEventListener('click', createPlan);
createJobButton.addEventListener('click', createJob);
for (const pill of togglePills) {
  pill.addEventListener('change', refreshTogglePills);
}
refreshTogglePills();

referenceImageFile.addEventListener('change', async () => {
  const file = referenceImageFile.files?.[0];
  if (!file) return;

  referencePreview.hidden = false;
  referencePreviewImage.src = URL.createObjectURL(file);
  referenceUploadStatus.textContent = '正在上传参考图';

  try {
    const dataUrl = await fileToDataUrl(file);
    const response = await requestJson('/video/api/uploads', {
      method: 'POST',
      body: JSON.stringify({
        fileName: file.name,
        dataUrl
      })
    });
    if (response.asset) {
      currentAssets = [response.asset];
    }
    referenceImageUrl.value = response.url;
    referenceUploadStatus.textContent = '参考图已准备好';
  } catch (error) {
    referenceUploadStatus.textContent = error.message;
    referenceImageUrl.value = '';
  }
});

segmentsOutput.addEventListener('click', async event => {
  const button = event.target.closest('.copy-link');
  if (!button) return;

  try {
    await navigator.clipboard.writeText(button.dataset.url || '');
    button.textContent = '已复制';
    setTimeout(() => {
      button.textContent = '复制链接';
    }, 1200);
  } catch {
    statusText.textContent = '复制失败，请手动打开原链接';
  }
});
