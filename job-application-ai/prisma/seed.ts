import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.masterResume.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      content: JSON.stringify({
        summary: 'Experienced software engineer with a focus on full-stack development.',
        skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'AWS'],
        experience: [
          {
            title: 'Senior Software Engineer',
            company: 'Example Corp',
            duration: '2021 - Present',
            highlights: ['Built scalable web applications', 'Led cross-functional teams'],
          },
        ],
        education: [
          {
            degree: 'B.S. Computer Science',
            institution: 'Example University',
            year: '2020',
          },
        ],
      }),
      rawText:
        'Experienced software engineer with a focus on full-stack development. Skills: TypeScript, React, Node.js, PostgreSQL, AWS.',
    },
  });

  console.log('Seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
