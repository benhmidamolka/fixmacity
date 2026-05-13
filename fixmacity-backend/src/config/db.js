'use strict';

/**
 * db.js — Local PostgreSQL connection via `pg` (node-postgres)
 *
 * Exposes a thin compatibility shim so every existing controller that uses
 *   supabase.from('table').select(...).eq(...).single()
 * continues to work without changes.
 *
 * pgAdmin setup:
 *   Host: localhost | Port: 5432 | DB: fixmacity | User: postgres
 *
 * Required .env variables:
 *   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
 */

const { Pool } = require('pg');

// ── Connection pool ───────────────────────────────────────────
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'fixmacity',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: parseInt(process.env.DB_POOL_MAX || '10', 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected idle client error:', err.message);
});

// ── Query builder — mirrors the Supabase client interface ────
// Supports the chained query style used throughout every controller:
//   supabase.from('t').select('*').eq('id', x).is('deleted_at', null).single()

class QB {
  constructor(table) {
    this._table = table;
    this._op = null;     // 'select' | 'insert' | 'update' | 'delete'
    this._cols = '*';
    this._data = null;
    this._wheres = [];       // { sql: string, vals: any[] }
    this._orders = [];       // 'col ASC|DESC'
    this._rangeFrom = null;
    this._rangeTo = null;
    this._limitN = null;
    this._single = false;
    this._maybe = false;
    this._countOnly = false;
    this._withCount = false;
    this._paramIdx = 1;      // next $N placeholder
    this._paramVals = [];     // all bound values
  }

  // ── Operation ────────────────────────────────────────────
  select(cols = '*', opts = {}) {
    if (!this._op) this._op = 'select';
    this._cols = this._stripEmbeds(cols);
    if (opts.count === 'exact') this._withCount = true;
    if (opts.head === true) this._countOnly = true;
    return this;
  }

  insert(obj) {
    this._op = 'insert';
    this._data = Array.isArray(obj) ? obj : [obj];
    return this;
  }

  upsert(obj, opts = {}) {
    this._op = 'upsert';
    this._data = Array.isArray(obj) ? obj : [obj];
    this._upsertOpts = opts;
    return this;
  }

  update(obj) {
    this._op = 'update';
    this._data = obj;
    return this;
  }

  delete() { this._op = 'delete'; return this; }

  // ── Filters ──────────────────────────────────────────────
  eq(col, val) {
    if (val === null || val === undefined) return this.is(col, null);
    this._wheres.push({ sql: `"${col}" = $${this._paramIdx++}`, vals: [val] });
    this._paramVals.push(val);
    return this;
  }

  neq(col, val) {
    this._wheres.push({ sql: `"${col}" != $${this._paramIdx++}`, vals: [val] });
    this._paramVals.push(val);
    return this;
  }

  is(col, val) {
    if (val === null || val === undefined) {
      this._wheres.push({ sql: `"${col}" IS NULL`, vals: [] });
    } else {
      this._wheres.push({ sql: `"${col}" IS $${this._paramIdx++}`, vals: [val] });
      this._paramVals.push(val);
    }
    return this;
  }

  gt(col, val) { return this._cmp(col, '>', val); }
  gte(col, val) { return this._cmp(col, '>=', val); }
  lt(col, val) { return this._cmp(col, '<', val); }
  lte(col, val) { return this._cmp(col, '<=', val); }

  _cmp(col, op, val) {
    this._wheres.push({ sql: `"${col}" ${op} $${this._paramIdx++}`, vals: [val] });
    this._paramVals.push(val);
    return this;
  }

  in(col, arr) {
    if (!arr || arr.length === 0) {
      this._wheres.push({ sql: '1=0', vals: [] });
      return this;
    }
    const placeholders = arr.map(() => `$${this._paramIdx++}`).join(', ');
    this._wheres.push({ sql: `"${col}" IN (${placeholders})`, vals: arr });
    this._paramVals.push(...arr);
    return this;
  }

  /**
   * .or('col1.eq.val1,col2.eq.val2') — Supabase-style OR filter
   * Parses simple Supabase filter strings into SQL OR conditions.
   * Supported operators: eq, neq, is, gt, gte, lt, lte, ilike, like
   */
  or(filterString) {
    const parts = filterString.split(',').map(s => s.trim());
    const sqlParts = [];
    const vals = [];

    for (const part of parts) {
      // Match: col.op.value  (value may contain dots)
      const dotIdx1 = part.indexOf('.');
      if (dotIdx1 === -1) continue;
      const col = part.slice(0, dotIdx1);
      const rest = part.slice(dotIdx1 + 1);
      const dotIdx2 = rest.indexOf('.');
      if (dotIdx2 === -1) continue;
      const op  = rest.slice(0, dotIdx2);
      const val = rest.slice(dotIdx2 + 1);

      switch (op) {
        case 'eq':
          if (val === 'null') {
            sqlParts.push(`"${col}" IS NULL`);
          } else {
            sqlParts.push(`"${col}" = $${this._paramIdx++}`);
            vals.push(val);
            this._paramVals.push(val);
          }
          break;
        case 'neq':
          sqlParts.push(`"${col}" != $${this._paramIdx++}`);
          vals.push(val);
          this._paramVals.push(val);
          break;
        case 'is':
          sqlParts.push(val === 'null' ? `"${col}" IS NULL` : `"${col}" IS $${this._paramIdx++}`);
          if (val !== 'null') { vals.push(val); this._paramVals.push(val); }
          break;
        case 'gt':  sqlParts.push(`"${col}" > $${this._paramIdx++}`);  vals.push(val); this._paramVals.push(val); break;
        case 'gte': sqlParts.push(`"${col}" >= $${this._paramIdx++}`); vals.push(val); this._paramVals.push(val); break;
        case 'lt':  sqlParts.push(`"${col}" < $${this._paramIdx++}`);  vals.push(val); this._paramVals.push(val); break;
        case 'lte': sqlParts.push(`"${col}" <= $${this._paramIdx++}`); vals.push(val); this._paramVals.push(val); break;
        case 'ilike': sqlParts.push(`"${col}" ILIKE $${this._paramIdx++}`); vals.push(val); this._paramVals.push(val); break;
        case 'like':  sqlParts.push(`"${col}" LIKE $${this._paramIdx++}`);  vals.push(val); this._paramVals.push(val); break;
        default: break;
      }
    }

    if (sqlParts.length > 0) {
      this._wheres.push({ sql: `(${sqlParts.join(' OR ')})`, vals });
    }
    return this;
  }

  /** .ilike(col, pattern) — case-insensitive LIKE */
  ilike(col, pattern) {
    this._wheres.push({ sql: `"${col}" ILIKE $${this._paramIdx++}`, vals: [pattern] });
    this._paramVals.push(pattern);
    return this;
  }

  /**
   * .not('col', 'in', '(val1,val2)')  — Supabase-style
   * Parses the string list and builds NOT IN.
   */
  not(col, op, val) {
    if (op === 'in') {
      const list = typeof val === 'string'
        ? val.replace(/[()]/g, '').split(',').map(s => s.trim().replace(/^"|"$/g, ''))
        : val;
      if (!list.length) return this;
      const placeholders = list.map(() => `$${this._paramIdx++}`).join(', ');
      this._wheres.push({ sql: `"${col}" NOT IN (${placeholders})`, vals: list });
      this._paramVals.push(...list);
    } else {
      this._wheres.push({ sql: `NOT ("${col}" ${op.toUpperCase()} $${this._paramIdx++})`, vals: [val] });
      this._paramVals.push(val);
    }
    return this;
  }

  // ── Ordering / pagination ────────────────────────────────
  order(col, opts = {}) {
    const dir = opts.ascending === false ? 'DESC' : 'ASC';
    this._orders.push(`"${col}" ${dir}`);
    return this;
  }

  range(from, to) { this._rangeFrom = Number(from); this._rangeTo = Number(to); return this; }
  limit(n) { this._limitN = Number(n); return this; }

  // ── Result shape ─────────────────────────────────────────
  single() { this._single = true; this._limitN = 1; return this._run(); }
  maybeSingle() { this._maybe = true; this._limitN = 1; return this._run(); }

  then(resolve, reject) { return this._run().then(resolve, reject); }

  // ── SQL helpers ──────────────────────────────────────────
  _whereClause() {
    if (!this._wheres.length) return '';
    return 'WHERE ' + this._wheres.map(w => w.sql).join(' AND ');
  }

  _orderClause() {
    const parts = [];
    if (this._orders.length) parts.push('ORDER BY ' + this._orders.join(', '));
    if (this._rangeFrom !== null) {
      parts.push(`LIMIT ${this._rangeTo - this._rangeFrom + 1} OFFSET ${this._rangeFrom}`);
    } else if (this._limitN !== null) {
      parts.push(`LIMIT ${this._limitN}`);
    }
    return parts.join(' ');
  }

  /** Strip PostgREST embed specs like  users!fk(col1, col2)  */
  _stripEmbeds(cols) {
    if (cols === '*') return '*';
    const clean = cols.replace(/\([^)]*\)/g, '');
    return clean.split(',').map(c => {
      const t = c.trim();
      if (t.includes('!')) return null;
      if (!t) return null;
      return t;
    }).filter(Boolean).join(', ') || '*';
  }

  // ── Execution ────────────────────────────────────────────
  async _run() {
    const where = this._whereClause();
    const orderLim = this._orderClause();
    const params = [...this._paramVals];

    try {
      // PostgreSQL identifier escaper helper
      const escapeId = (id) => `"${id.replace(/"/g, '""')}"`;
      const tableId = escapeId(this._table);

      // ── SELECT ──
      if (this._op === 'select') {
        if (this._countOnly) {
          const res = await pool.query(
            `SELECT COUNT(*) FROM ${tableId} ${where}`, params
          );
          return { data: null, error: null, count: parseInt(res.rows[0].count, 10) };
        }

        const sql = `SELECT ${this._cols} FROM ${tableId} ${where} ${orderLim}`;

        if (this._withCount) {
          const countSql = `SELECT COUNT(*) FROM ${tableId} ${where}`;
          const [dataRes, countRes] = await Promise.all([
            pool.query(sql, params),
            pool.query(countSql, params),
          ]);
          const count = parseInt(countRes.rows[0].count, 10);
          const rows = dataRes.rows;
          if (this._single) return rows[0]
            ? { data: rows[0], error: null, count }
            : { data: null, error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' }, count };
          return { data: rows, error: null, count };
        }

        const res = await pool.query(sql, params);
        if (this._single) return res.rows[0]
          ? { data: res.rows[0], error: null }
          : { data: null, error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' } };
        if (this._maybe) return { data: res.rows[0] || null, error: null };
        return { data: res.rows, error: null };
      }

      // ── INSERT ──
      if (this._op === 'insert') {
        const results = [];
        const returningCols = this._cols || '*';
        for (const row of this._data) {
          const keys = Object.keys(row).filter(k => row[k] !== undefined);
          const cols = keys.map(k => escapeId(k)).join(', ');
          const plc = keys.map((_, i) => `$${i + 1}`).join(', ');
          const vals = keys.map(k => row[k]);
          const res = await pool.query(
            `INSERT INTO ${tableId} (${cols}) VALUES (${plc}) RETURNING ${returningCols}`, vals
          );
          results.push(res.rows[0]);
        }
        if (this._single || this._data.length === 1)
          return { data: results[0] || null, error: null };
        return { data: results, error: null };
      }

      // ── UPSERT ──
      if (this._op === 'upsert') {
        const results = [];
        const returningCols = this._cols || '*';
        const onConflict = this._upsertOpts?.onConflict || 'id';
        const conflictKeys = onConflict.split(',').map(k => escapeId(k.trim())).join(', ');

        for (const row of this._data) {
          const keys = Object.keys(row).filter(k => row[k] !== undefined);
          const cols = keys.map(k => escapeId(k)).join(', ');
          const plc = keys.map((_, i) => `$${i + 1}`).join(', ');
          const vals = keys.map(k => row[k]);
          
          const updateKeys = keys.filter(k => !onConflict.split(',').map(x => x.trim()).includes(k));
          const setClause = updateKeys.length > 0 
            ? 'DO UPDATE SET ' + updateKeys.map(k => `${escapeId(k)} = EXCLUDED.${escapeId(k)}`).join(', ')
            : 'DO NOTHING';

          const res = await pool.query(
            `INSERT INTO ${tableId} (${cols}) VALUES (${plc}) ON CONFLICT (${conflictKeys}) ${setClause} RETURNING ${returningCols}`, vals
          );
          if (res.rows[0]) results.push(res.rows[0]);
        }
        if (this._single || this._data.length === 1)
          return { data: results[0] || null, error: null };
        return { data: results, error: null };
      }

      // ── UPDATE ──
      if (this._op === 'update') {
        if (!this._wheres.length) {
          return { data: null, error: { message: 'UPDATE requires a WHERE clause (e.g., .eq()) to prevent accidental mass updates.' } };
        }
        const keys = Object.keys(this._data).filter(k => this._data[k] !== undefined);
        const setVals = keys.map(k => this._data[k]);
        const setStr = keys.map((k, i) => `${escapeId(k)} = $${i + 1}`).join(', ');
        // Re-index WHERE params after the SET params
        const offset = keys.length;
        const reParms = this._reindexWhere(offset + 1);
        const allVals = [...setVals, ...reParms.vals];
        const returningCols = this._cols || '*';
        const sql = `UPDATE ${tableId} SET ${setStr} ${reParms.clause} RETURNING ${returningCols}`;
        const res = await pool.query(sql, allVals);
        if (this._single) return res.rows[0]
          ? { data: res.rows[0], error: null }
          : { data: null, error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' } };
        return { data: res.rows, error: null };
      }

      // ── DELETE ──
      if (this._op === 'delete') {
        const returningCols = this._cols || '*';
        const res = await pool.query(
          `DELETE FROM ${tableId} ${where} RETURNING ${returningCols}`, params
        );
        return { data: res.rows, error: null };
      }

      return { data: null, error: { message: `Unknown op: ${this._op}` } };

    } catch (err) {
      console.error(`[DB] ${this._op?.toUpperCase()} "${this._table}" error:`, err.message);
      console.error(`[DB] FAILED SQL:`, this._op === 'select' ? `SELECT ${this._cols} FROM "${this._table}" ${this._whereClause()} ${this._orderClause()}` : '...');
      console.error(`[DB] PARAMS:`, params);
      return { data: null, error: { message: err.message, code: err.code } };
    }
  }

  /** Rebuild the WHERE clause with params starting at `startIdx` (for UPDATE). */
  _reindexWhere(startIdx) {
    let idx = startIdx;
    const vals = [];
    const clauses = this._wheres.map(w => {
      if (!w.vals.length) return w.sql; // IS NULL etc.
      vals.push(...w.vals);
      return w.sql.replace(/\$\d+/g, () => `$${idx++}`);
    });
    return {
      clause: clauses.length ? 'WHERE ' + clauses.join(' AND ') : '',
      vals,
    };
  }
}

// ── RPC wrapper — calls PL/pgSQL functions ───────────────────
async function rpc(fnName, params = {}) {
  try {
    const keys = Object.keys(params);
    // Use named-parameter syntax:  fn(key => $1, key2 => $2)
    const named = keys.map((k, i) => `${k} => $${i + 1}`).join(', ');
    const vals = keys.map(k => params[k]);
    const sql = `SELECT * FROM ${fnName}(${named})`;
    const res = await pool.query(sql, vals);

    // If the function returns a scalar (e.g. increment_ref_sequence → INTEGER),
    // unwrap it from the single-column single-row result.
    if (res.rows.length === 1) {
      const cols = Object.keys(res.rows[0]);
      if (cols.length === 1) return { data: res.rows[0][cols[0]], error: null };
    }
    return { data: res.rows, error: null };
  } catch (err) {
    console.error(`[DB] RPC ${fnName} error:`, err.message);
    return { data: null, error: { message: err.message, code: err.code } };
  }
}

// ── Public interface — drop-in Supabase replacement ──────────
const supabase = {
  from: (table) => new QB(table),
  rpc,
  pool,   // exposed for raw queries in services that need them
};

module.exports = supabase;
