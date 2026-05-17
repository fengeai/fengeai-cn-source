
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

// Ensure we are in the right directory or adjust paths
const BASE_URL = 'http://localhost:3000';
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
    throw new Error('ACCESS_TOKEN is required');
}

async function testUpload() {
    console.log('1. Creating dummy test file...');
    const zip = new AdmZip();
    zip.addFile("index.html", Buffer.from("<h1>Hello World from Test</h1>"));
    const zipPath = path.join(__dirname, 'test_payload.zip');
    zip.writeZip(zipPath);

    console.log('2. Uploading file...');
    const formData = new FormData();
    formData.append('projectName', 'test-auto-001');
    formData.append('token', ACCESS_TOKEN);
    formData.append('author', 'Tester');
    formData.append('description', 'Automated test upload');
    
    // Read file as blob/buffer for fetch
    const fileBuffer = fs.readFileSync(zipPath);
    const fileBlob = new Blob([fileBuffer], { type: 'application/zip' });
    formData.append('file', fileBlob, 'test_payload.zip');

    try {
        const res = await fetch(`${BASE_URL}/api/upload`, {
            method: 'POST',
            body: formData
        });

        const json = await res.json();
        console.log('Upload Response:', json);

        if (!res.ok) {
            throw new Error(json.error || 'Upload failed');
        }

        console.log('3. Verifying access...');
        // The URL returned might be relative or absolute depending on my previous fix
        // My previous fix: const projectUrl = `/works/${projectName}/`;
        const accessUrl = `${BASE_URL}${json.url}index.html`; 
        console.log('Fetching:', accessUrl);
        
        const accessRes = await fetch(accessUrl);
        if (accessRes.ok) {
            const text = await accessRes.text();
            console.log('Access Success! Content:', text);
            if (text.includes('Hello World from Test')) {
                console.log('✅ TEST PASSED');
            } else {
                console.error('❌ Content mismatch');
            }
        } else {
            console.error('❌ Access failed:', accessRes.status);
        }

    } catch (err) {
        console.error('❌ Test Failed:', err);
    } finally {
        // Cleanup
        if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    }
}

testUpload();
