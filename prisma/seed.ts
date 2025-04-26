import { PrismaClient, ProjectStatus } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  console.log(`Start seeding ...`)

  const project1 = await prisma.project.upsert({
    where: { name: 'Vibe Cockpit Alpha' },
    update: {},
    create: {
      name: 'Vibe Cockpit Alpha',
      status: ProjectStatus.design,
      frontendUrl: 'https://alpha.vibe-cockpit.dev'
    },
  });
  console.log(`Created project with id: ${project1.id}`)

  const project2 = await prisma.project.upsert({
    where: { name: 'Legacy Dashboard' },
    update: {},
    create: {
      name: 'Legacy Dashboard',
      status: ProjectStatus.retired,
      frontendUrl: 'https://old.dashboard.com'
    },
  });
  console.log(`Created project with id: ${project2.id}`)

  console.log(`Seeding finished.`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  }) 