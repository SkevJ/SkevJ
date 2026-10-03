// Reads everything the cards need from GitHub's GraphQL API.
//
// Two tokens are involved:
//   GH_TOKEN      a personal access token (classic: `repo` + `read:user`). It sees
//                 private repositories, so it is the only way to get languages
//                 and commit times from private work.
//   GITHUB_TOKEN  the workflow's own token. It only sees public data, but the
//                 contribution calendar is public (private work shows as counts),
//                 so the calendar never depends on the personal token.
// Only aggregates are returned: no private repository names leave this module.

const API = 'https://api.github.com/graphql';

export class GitHubError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function graphql(token, query, variables = {}) {
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      Authorization: `bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'profile-cards',
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(30000),
  });
  const raw = await res.text();
  let json = null;
  try { json = JSON.parse(raw); } catch { /* not JSON */ }
  if (!res.ok) throw new GitHubError(res.status, json?.message || raw.slice(0, 200));
  if (json?.errors?.length && !json.data) throw new GitHubError(200, json.errors.map((e) => e.message).join('; '));
  return { data: json.data, errors: json.errors || [], expiry: res.headers.get('github-authentication-token-expiration') };
}

function parseExpiry(header) {
  if (!header) return null;
  const t = Date.parse(header.replace(' UTC', 'Z').replace(/ ([+-]\d{2})(\d{2})$/, '$1:$2').replace(' ', 'T'));
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

export async function checkToken(token, login) {
  const { data, expiry } = await graphql(token, 'query{viewer{login}}');
  const owner = data?.viewer?.login || '';
  if (owner.toLowerCase() !== login.toLowerCase()) {
    return { ok: false, reason: `GH_TOKEN belongs to "${owner}", not "${login}".` };
  }
  return { ok: true, expiresAt: parseExpiry(expiry) };
}

const CALENDAR = `query($login:String!){user(login:$login){id createdAt contributionsCollection{
  contributionYears
  contributionCalendar{totalContributions weeks{contributionDays{date contributionCount}}}
  commitContributionsByRepository(maxRepositories:25){repository{name owner{login}} contributions{totalCount}}
}}}`;

const YEAR = `query($login:String!,$from:DateTime!,$to:DateTime!){user(login:$login){
  contributionsCollection(from:$from,to:$to){contributionCalendar{weeks{contributionDays{date contributionCount}}}}
}}`;

const days = (calendar) =>
  calendar.weeks.flatMap((w) => w.contributionDays.map((d) => [d.date, d.contributionCount]));

export async function fetchCalendar(token, login) {
  const { data } = await graphql(token, CALENDAR, { login });
  if (!data?.user) throw new GitHubError(404, `User ${login} not found`);
  const cc = data.user.contributionsCollection;
  const all = [...days(cc.contributionCalendar)];
  const now = new Date();
  for (const year of cc.contributionYears) {
    const from = `${year}-01-01T00:00:00Z`;
    const to = year === now.getUTCFullYear() ? now.toISOString() : `${year}-12-31T23:59:59Z`;
    const res = await graphql(token, YEAR, { login, from, to });
    all.push(...days(res.data.user.contributionsCollection.contributionCalendar));
  }
  return {
    userId: data.user.id,
    days: all,
    lastYearTotal: cc.contributionCalendar.totalContributions,
    repos: cc.commitContributionsByRepository.map((r) => ({ owner: r.repository.owner.login, name: r.repository.name })),
  };
}

const REPOS = `query($login:String!,$after:String){user(login:$login){
  repositories(first:50,after:$after,ownerAffiliations:OWNER,isFork:false,orderBy:{field:PUSHED_AT,direction:DESC}){
    pageInfo{hasNextPage endCursor}
    nodes{name languages(first:25,orderBy:{field:SIZE,direction:DESC}){edges{size node{name}}}}
  }
}}`;

// Bytes per language as GitHub's Linguist counts them (vendored and generated
// files already excluded), summed over every non-fork repository the user owns.
export async function fetchLanguages(token, login, { excludeRepos = [] } = {}) {
  const skip = new Set(excludeRepos.map((s) => s.toLowerCase()));
  const totals = new Map();
  let repos = 0, after = null;
  for (let page = 0; page < 10; page++) {
    const { data } = await graphql(token, REPOS, { login, after });
    const conn = data.user.repositories;
    for (const repo of conn.nodes) {
      if (skip.has(repo.name.toLowerCase())) continue;
      if (!repo.languages.edges.length) continue;
      repos++;
      for (const e of repo.languages.edges) totals.set(e.node.name, (totals.get(e.node.name) || 0) + e.size);
    }
    if (!conn.pageInfo.hasNextPage) break;
    after = conn.pageInfo.endCursor;
  }
  return {
    perLanguage: [...totals.entries()].map(([name, bytes]) => ({ name, bytes })).sort((a, b) => b.bytes - a.bytes),
    repos,
  };
}

const HISTORY = `query($owner:String!,$name:String!,$author:ID!,$since:GitTimestamp!,$after:String){
  repository(owner:$owner,name:$name){defaultBranchRef{target{... on Commit{
    history(first:100,after:$after,since:$since,author:{id:$author}){pageInfo{hasNextPage endCursor} nodes{authoredDate}}
  }}}}
}`;

// When the user's own commits happened over the last year, across every repository
// they committed to (default branches only, which is what GitHub counts too).
export async function fetchCommitTimes(token, { userId, repos }) {
  const since = new Date(Date.now() - 365 * 86400000).toISOString();
  const stamps = [];
  for (const { owner, name } of repos) {
    let after = null;
    for (let page = 0; page < 40; page++) {
      let res;
      try {
        res = await graphql(token, HISTORY, { owner, name, author: userId, since, after });
      } catch {
        break; // a repository we cannot read (deleted, empty, access revoked) is skipped
      }
      const history = res.data?.repository?.defaultBranchRef?.target?.history;
      if (!history) break;
      for (const n of history.nodes) stamps.push(n.authoredDate);
      if (!history.pageInfo.hasNextPage) break;
      after = history.pageInfo.endCursor;
    }
  }
  return stamps;
}
