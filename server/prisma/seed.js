const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create demo users
  const users = [];
  const usernames = ['ProGamer', 'SniperElite', 'TacticalMaster', 'RushKing', 'CampFan'];
  
  for (let i = 0; i < usernames.length; i++) {
    const hashedPassword = await bcrypt.hash('password123', 12);
    const user = await prisma.user.create({
      data: {
        email: `${usernames[i].toLowerCase()}@cufire.com`,
        username: usernames[i],
        password: hashedPassword,
        totalScore: Math.floor(Math.random() * 10000) + 1000,
        gamesPlayed: Math.floor(Math.random() * 50) + 10,
        tournamentsWon: Math.floor(Math.random() * 5)
      }
    });
    users.push(user);
  }

  // Create demo tournaments
  const tournaments = [];
  const tournamentData = [
    {
      name: 'Torneo Semanal de Elimintación',
      prizePool: 15000,
      maxParticipants: 64,
      startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      entryFee: 10,
      status: 'UPCOMING'
    },
    {
      name: 'Championship Pro Series',
      prizePool: 50000,
      maxParticipants: 128,
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      entryFee: 25,
      status: 'UPCOMING'
    },
    {
      name: 'Quick Battle Royale',
      prizePool: 5000,
      maxParticipants: 32,
      startDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
      entryFee: 5,
      status: 'UPCOMING'
    },
    {
      name: 'Masters Tournament',
      prizePool: 100000,
      maxParticipants: 256,
      startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
      entryFee: 50,
      status: 'UPCOMING'
    }
  ];

  for (const tournamentInfo of tournamentData) {
    const tournament = await prisma.tournament.create({
      data: tournamentInfo
    });
    tournaments.push(tournament);
  }

  // Add participants to tournaments
  for (let i = 0; i < tournaments.length; i++) {
    const numParticipants = Math.floor(Math.random() * 10) + 5; // 5-15 participants
    const shuffledUsers = [...users].sort(() => 0.5 - Math.random());
    
    for (let j = 0; j < Math.min(numParticipants, users.length); j++) {
      await prisma.tournamentParticipant.create({
        data: {
          userId: shuffledUsers[j].id,
          tournamentId: tournaments[i].id,
          score: Math.floor(Math.random() * 5000) + 100
        }
      });
    }
  }

  console.log('✅ Database seeded successfully!');
  console.log(`📊 Created ${users.length} users and ${tournaments.length} tournaments`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });