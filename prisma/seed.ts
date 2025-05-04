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

  // Seed Checklist Items for Project 1
  console.log(`Seeding checklist items for ${project1.name} (${project1.id})...`);
  const checklistItemsData = [
    { order: 1, title: 'Configure DNS', is_complete: true },
    { order: 2, title: 'Set up monitoring alerts', is_complete: true },
    { order: 3, title: 'Run performance audit (Lighthouse)', is_complete: false },
    { order: 4, title: 'Final stakeholder sign-off', is_complete: false, ai_help_hint: 'Draft stakeholder update email...' },
    { order: 5, title: 'Schedule social media announcement', is_complete: false },
    { order: 6, title: 'Update README for production', is_complete: false },
    { order: 7, title: 'Confirm environment variables on Vercel', is_complete: true },
  ];

  let createdCount = 0;
  for (const itemData of checklistItemsData) {
    await prisma.checklistItem.upsert({
        where: { projectId_order: { projectId: project1.id, order: itemData.order } },
        update: { title: itemData.title, is_complete: itemData.is_complete, ai_help_hint: itemData.ai_help_hint },
        create: {
            projectId: project1.id,
            order: itemData.order,
            title: itemData.title,
            is_complete: itemData.is_complete,
            ai_help_hint: itemData.ai_help_hint,
        }
    });
    createdCount++;
  }
  console.log(`Upserted ${createdCount} checklist items for project ${project1.id}.`);

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
