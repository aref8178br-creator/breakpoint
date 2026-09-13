const FTS_OPERATORS = new Set(['AND', 'OR', 'NOT', 'NEAR']);

const MAX_TERMS = 8;
const MAX_TERM_LENGTH = 50;

function buildFtsQuery(raw) {
  if (typeof raw !== 'string') return null;

  const terms = raw
    .normalize('NFKC')
    .split(/[^\p{L}\p{N}]+/u)
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => !FTS_OPERATORS.has(t.toUpperCase()))
    .slice(0, MAX_TERMS)
    .map((t) => t.slice(0, MAX_TERM_LENGTH));

  if (terms.length === 0) return null;

  return terms.map((t) => `"${t}"*`).join(' AND ');
}

module.exports = { buildFtsQuery };
