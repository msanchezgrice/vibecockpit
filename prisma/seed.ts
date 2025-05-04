import { PrismaClient, ProjectStatus, Prisma } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);

  // Seed Projects
  const project1 = await prisma.project.upsert({
    where: { name: 'Vibe Cockpit Alpha' },
    update: {},
    create: {
      name: 'Vibe Cockpit Alpha',
      status: ProjectStatus.prep_launch, // Set to prep_launch for testing checklist
      description: 'Internal dashboard for monitoring project vibes.',
      url: 'https://vibecockpit.vercel.app',
      platform: 'CURSOR',
      vercelProjectId: 'prj_...YOUR_ALPHA_PROJECT_ID', // Replace with actual ID if known
      repoUrl: 'msanchezgrice/vibecockpit',
      thumbUrl: '/images/thumb-placeholder.png',
      image_url: null, // Add image_url field with null value
    },
  });
  console.log(`Created/updated project with id: ${project1.id}`);

  const project2 = await prisma.project.upsert({
    where: { name: 'Legacy Dashboard' },
    update: { status: ProjectStatus.retired }, // Ensure retired status
    create: {
      name: 'Legacy Dashboard',
      status: ProjectStatus.retired,
      url: 'https://old.dashboard.com',
      platform: 'OTHER',
      thumbUrl: '/images/thumb-placeholder.png',
      image_url: null, // Add image_url field with null value
    },
  });
  console.log(`Created/updated project with id: ${project2.id}`);

  console.log(`Seeding finished.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
