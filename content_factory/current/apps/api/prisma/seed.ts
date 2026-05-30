import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.articleVariant.deleteMany();
  await prisma.article.deleteMany();
  await prisma.topic.deleteMany();

  await prisma.topic.createMany({
    data: [
      {
        title: 'AI 编程初学者如何搭建自己的内容工作台',
        summary: '面向刚开始使用 AI 编程的人，讲清楚如何从零搭建一个能持续产出内容的工作流。',
        audience: 'AI 编程初学者',
        angle: '从工具堆砌转向内容生产流程设计',
        keywordsCsv: 'AI 编程,内容工作台,初学者',
        status: 'selected',
      },
      {
        title: '为什么内容团队需要自己的品牌语气库',
        summary: '解释品牌语气、风格模板和提示词模板为什么应该沉淀成资产，而不是临时写 prompt。',
        audience: '内容运营团队',
        angle: '把一次性 prompt 变成可复用系统',
        keywordsCsv: '品牌语气,Prompt 模板,内容资产',
        status: 'draft',
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
