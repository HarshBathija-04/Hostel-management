const { toPg, pool } = require('../config/database');
const { getPaginationParams, createPagination, buildWhere, buildSet } = require('../utils/helpers');
const { academicYear } = require('../db/seed');

afterAll(() => pool.end());

test('toPg numbers ? placeholders in order', () => {
    expect(toPg('SELECT * FROM t WHERE a = ? AND b IN (?, ?)')).toBe('SELECT * FROM t WHERE a = $1 AND b IN ($2, $3)');
    expect(toPg('SELECT 1')).toBe('SELECT 1');
});

test('pagination params are clamped', () => {
    expect(getPaginationParams({ query: {} })).toEqual({ page: 1, limit: 10, offset: 0 });
    expect(getPaginationParams({ query: { page: '3', limit: '500' } })).toEqual({ page: 3, limit: 100, offset: 200 });
    expect(getPaginationParams({ query: { page: '-2', limit: 'x' } })).toEqual({ page: 1, limit: 10, offset: 0 });
});

test('createPagination reports next/prev pages', () => {
    expect(createPagination(2, 10, 25)).toMatchObject({ totalPages: 3, hasNextPage: true, hasPrevPage: true });
    expect(createPagination(1, 10, 0)).toMatchObject({ totalPages: 0, hasNextPage: false, hasPrevPage: false });
});

test('academic year starts in July', () => {
    expect(academicYear(new Date('2026-11-11'))).toMatchObject({
        start: '2026-07-15',
        end: '2027-06-30',
        months: ['2026-07', '2026-08', '2026-09', '2026-10', '2026-11']
    });
    expect(academicYear(new Date('2027-02-01')).start).toBe('2026-07-15');
});

test('buildWhere skips empty filters and repeats values per placeholder', () => {
    expect(buildWhere([['a = ?', 'x'], ['b = ?', undefined], ['(c ILIKE ? OR d ILIKE ?)', '%y%']])).toEqual({
        whereClause: 'WHERE TRUE AND a = ? AND (c ILIKE ? OR d ILIKE ?)',
        params: ['x', '%y%', '%y%']
    });
    expect(buildWhere([['a = ?', '']]).whereClause).toBe('WHERE TRUE');
});

test('buildSet maps present camelCase fields to snake_case columns', () => {
    expect(buildSet({ firstName: 'A', isActive: false, password: 'x' }, ['firstName', 'lastName', 'isActive'])).toEqual({
        setClause: 'first_name = ?, is_active = ?',
        values: ['A', false]
    });
});
