// Everything the profile says lives here. Edit the words, rebuild, done.
// Work for employers and clients stays private: describe the kind of work,
// never the systems themselves.

export const config = {
  login: 'SkevJ',
  name: { first: 'Kevin', last: 'Sanchez' },
  role: 'Full-stack developer',
  place: 'San Pedro Sula · Honduras',
  timezone: { label: 'UTC−6', offsetMinutes: -360 },
  linkedin: 'https://www.linkedin.com/in/kevin-sanchez-5b41a8151',

  hero: {
    greeting: 'Hola, I’m Kevin.',
    intro: 'I build enterprise software end to end: React and TypeScript on the front, C# and SQL Server underneath, and direct links down to the physical machines on the plant floor. Most of it lives in private repositories.',
    keywords: ['enterprise software', 'React', 'TypeScript', 'C#', 'SQL Server', 'physical machines', 'plant floor', 'private repositories'],
  },

  sections: {
    work: { num: '01', word: 'Work', meta: '2024 — now', deck: 'Private projects, so the code stays private. This is the kind of work they are.' },
    numbers: { num: '02', word: 'Numbers', meta: 'Updated daily', deck: 'Read from GitHub every night. Private work counts too.' },
    tools: { num: '03', word: 'Tools', meta: 'Front to back', deck: 'What I reach for, from the browser down to the plant floor.' },
  },

  work: [
    {
      title: 'Talks to machines',
      body: 'Web apps that speak directly to industrial controllers, truck scales and biometric clocks on the plant floor.',
      keywords: ['Web apps', 'industrial controllers', 'truck scales', 'biometric clocks', 'plant floor'],
      tags: ['Hardware telemetry', 'Serial', 'Edge'],
    },
    {
      title: 'Real time',
      body: 'Live event streams and web push, so approvals, tickets and alerts reach people the moment they happen.',
      keywords: ['Live event streams', 'web push', 'approvals', 'tickets', 'alerts'],
      tags: ['WebSockets', 'Push', 'Live state'],
    },
    {
      title: 'Data people use',
      body: 'Financial statements built from ERP ledgers, sales forecasts, and spreadsheets and documents that write themselves.',
      keywords: ['Financial statements', 'ERP ledgers', 'sales forecasts', 'spreadsheets', 'documents'],
      tags: ['SQL Server', 'Forecasting', 'Reporting'],
    },
    {
      title: 'Tested before it ships',
      body: 'Automated tests on both ends run before every deploy. A red test means it doesn’t ship.',
      keywords: ['Automated tests', 'every deploy', 'red test', 'doesn’t ship'],
      tags: ['Unit tests', 'CI gates', 'Zero-fault'],
    },
  ],

  // `primary` = how many of the first items are the core of the group.
  tools: [
    {
      title: 'Front end',
      meta: 'Web · PWA',
      primary: 2,
      items: ['React', 'TypeScript', 'Vite', 'Tailwind CSS', 'shadcn/ui', 'TanStack Query', 'React Hook Form', 'Zod', 'Framer Motion', 'Three.js', 'Recharts', 'Leaflet', 'Workbox'],
    },
    {
      title: 'Back end & data',
      meta: '.NET · SQL Server',
      primary: 3,
      items: ['C#', 'ASP.NET Core', 'SQL Server', 'T-SQL', 'SignalR', 'Dapper', 'EF Core', 'JWT', 'FluentValidation', 'Serilog', 'Automated Documents', 'xUnit'],
    },
    {
      title: 'Plant floor & ops',
      meta: 'Hardware to cloud',
      primary: 2,
      items: ['IIS', 'Cloudflare', 'Windows Server', 'PowerShell', 'GitHub Actions', 'Node.js', 'Python', 'Industrial Serial', 'Edge Telemetry', 'Biometrics'],
    },
    {
      title: 'Lately',
      entries: [
        {
          label: 'Learning',
          text: 'Advanced TypeScript patterns, 3D on the web, and video production.',
          keywords: ['Advanced TypeScript patterns', '3D on the web', 'video production'],
        },
        {
          label: 'Off the clock',
          text: 'Playing piano.',
          keywords: ['Playing piano'],
        },
      ],
    },
  ],

  contact: {
    word: 'Let’s talk',
    body: 'Open to collaborations and consulting — .NET, React and SQL Server.',
    keywords: ['collaborations', 'consulting', '.NET', 'React', 'SQL Server'],
    link: 'LinkedIn',
  },

  // Which repositories and languages count toward the Languages plate.
  languages: { top: 5, excludeRepos: ['SkevJ'], excludeLanguages: [] },
};
