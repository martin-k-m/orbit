//! SQLite database explorer.
//!
//! Opens a `.sqlite`/`.db` file **read-only** and lets the UI browse tables and
//! run `SELECT` queries. Read-only is deliberate for a first slice: an explorer
//! should never accidentally mutate a developer's database. Other engines
//! (Postgres, MySQL, Redis) will come later behind the same shape.
//!
//! Feature-gated behind `persistence` (it needs `rusqlite`), like [`crate::store`].

use crate::error::Error;
use rusqlite::{types::ValueRef, Connection, OpenFlags};
use serde::{Deserialize, Serialize};
use std::path::Path;

/// A table (or view) in the database, with its row count.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Table {
    pub name: String,
    pub row_count: i64,
}

/// The result of a query: column headers and stringified rows (NULL → `null`).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryResult {
    pub columns: Vec<String>,
    pub rows: Vec<Vec<Option<String>>>,
    pub row_count: usize,
}

fn map_err(e: rusqlite::Error) -> Error {
    Error::Command {
        command: "sqlite".into(),
        message: e.to_string(),
    }
}

fn open(path: &Path) -> crate::Result<Connection> {
    Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_ONLY).map_err(map_err)
}

/// List the database's user tables and views, alphabetically, with row counts.
pub fn tables(path: &Path) -> crate::Result<Vec<Table>> {
    let conn = open(path)?;
    let names: Vec<String> = {
        let mut stmt = conn
            .prepare(
                "SELECT name FROM sqlite_master \
                 WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' \
                 ORDER BY name",
            )
            .map_err(map_err)?;
        let rows = stmt
            .query_map([], |r| r.get::<_, String>(0))
            .map_err(map_err)?;
        rows.filter_map(|r| r.ok()).collect()
    };

    let mut tables = Vec::with_capacity(names.len());
    for name in names {
        // `name` comes from sqlite_master, but quote it defensively anyway.
        let count: i64 = conn
            .query_row(
                &format!("SELECT COUNT(*) FROM \"{}\"", name.replace('"', "\"\"")),
                [],
                |r| r.get(0),
            )
            .unwrap_or(0);
        tables.push(Table {
            name,
            row_count: count,
        });
    }
    Ok(tables)
}

/// Run a read query and return up to `max_rows` rows.
pub fn query(path: &Path, sql: &str, max_rows: usize) -> crate::Result<QueryResult> {
    let conn = open(path)?;
    let mut stmt = conn.prepare(sql).map_err(map_err)?;
    let columns: Vec<String> = stmt.column_names().into_iter().map(String::from).collect();
    let col_count = columns.len();

    let mut rows = Vec::new();
    let mut query_rows = stmt.query([]).map_err(map_err)?;
    while let Some(row) = query_rows.next().map_err(map_err)? {
        if rows.len() >= max_rows {
            break;
        }
        let mut cells = Vec::with_capacity(col_count);
        for i in 0..col_count {
            let value = row.get_ref(i).map_err(map_err)?;
            cells.push(value_to_string(value));
        }
        rows.push(cells);
    }

    Ok(QueryResult {
        row_count: rows.len(),
        columns,
        rows,
    })
}

/// Convenience: the first `limit` rows of a table.
pub fn table_rows(path: &Path, table: &str, limit: usize) -> crate::Result<QueryResult> {
    let sql = format!(
        "SELECT * FROM \"{}\" LIMIT {}",
        table.replace('"', "\"\""),
        limit
    );
    query(path, &sql, limit)
}

/// Stringify a cell, or `None` for SQL NULL.
fn value_to_string(v: ValueRef<'_>) -> Option<String> {
    match v {
        ValueRef::Null => None,
        ValueRef::Integer(i) => Some(i.to_string()),
        ValueRef::Real(f) => Some(f.to_string()),
        ValueRef::Text(t) => Some(String::from_utf8_lossy(t).into_owned()),
        ValueRef::Blob(b) => Some(format!("<{} bytes>", b.len())),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn seed(path: &Path) {
        let conn = Connection::open(path).unwrap();
        conn.execute_batch(
            "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, age INTEGER);
             INSERT INTO users (name, age) VALUES ('Ada', 36), ('Grace', NULL);
             CREATE TABLE empty (x TEXT);",
        )
        .unwrap();
    }

    #[test]
    fn lists_tables_with_row_counts() {
        let tmp = tempfile::tempdir().unwrap();
        let path = tmp.path().join("t.sqlite");
        seed(&path);

        let ts = tables(&path).unwrap();
        let names: Vec<&str> = ts.iter().map(|t| t.name.as_str()).collect();
        assert_eq!(names, vec!["empty", "users"]);
        let users = ts.iter().find(|t| t.name == "users").unwrap();
        assert_eq!(users.row_count, 2);
    }

    #[test]
    fn queries_return_columns_and_stringified_cells() {
        let tmp = tempfile::tempdir().unwrap();
        let path = tmp.path().join("t.sqlite");
        seed(&path);

        let r = query(&path, "SELECT name, age FROM users ORDER BY name", 100).unwrap();
        assert_eq!(r.columns, vec!["name", "age"]);
        assert_eq!(r.row_count, 2);
        assert_eq!(r.rows[0], vec![Some("Ada".into()), Some("36".into())]);
        // NULL age comes back as None.
        assert_eq!(r.rows[1], vec![Some("Grace".into()), None]);
    }

    #[test]
    fn table_rows_respects_the_limit() {
        let tmp = tempfile::tempdir().unwrap();
        let path = tmp.path().join("t.sqlite");
        seed(&path);
        let r = table_rows(&path, "users", 1).unwrap();
        assert_eq!(r.row_count, 1);
    }

    #[test]
    fn read_only_rejects_writes() {
        let tmp = tempfile::tempdir().unwrap();
        let path = tmp.path().join("t.sqlite");
        seed(&path);
        // The explorer opens read-only, so a write must error, not mutate.
        assert!(query(&path, "DELETE FROM users", 100).is_err());
    }
}
