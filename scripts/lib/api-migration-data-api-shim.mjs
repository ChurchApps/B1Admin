function escapeIdentifier(value) {
  return `\`${String(value).replace(/`/g, "``")}\``;
}

function escapeColumnReference(value) {
  return String(value)
    .split(".")
    .map((part) => escapeIdentifier(part))
    .join(".");
}

function escapeSqlString(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "''");
}

function renderSqlValue(value) {
  if (value instanceof RawSql) return value.text;
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  return `'${escapeSqlString(value)}'`;
}

class RawSql {
  constructor(text) {
    this.text = String(text);
  }

  async execute(db) {
    return db.executeSql(this.text);
  }

  toString() {
    return this.text;
  }
}

function renderWhereClause(column, operator, value) {
  const normalized = String(operator || "").trim().toLowerCase();
  const lhs = escapeColumnReference(column);
  if (normalized === "is" || normalized === "is not") {
    if (value === null || value === undefined) return `${lhs} ${normalized.toUpperCase()} NULL`;
    return `${lhs} ${normalized.toUpperCase()} ${renderSqlValue(value)}`;
  }
  return `${lhs} ${operator} ${renderSqlValue(value)}`;
}

class SelectQueryBuilder {
  constructor(tableName, executeSql) {
    this.tableName = tableName;
    this.executeSql = executeSql;
    this.selected = [];
    this.conditions = [];
    this.limitCount = null;
  }

  select(columns) {
    const values = Array.isArray(columns) ? columns : [columns];
    this.selected.push(...values);
    return this;
  }

  where(column, operator, value) {
    this.conditions.push(renderWhereClause(column, operator, value));
    return this;
  }

  limit(count) {
    this.limitCount = count;
    return this;
  }

  async execute() {
    const columns = this.selected.length > 0
      ? this.selected.map((value) => escapeColumnReference(value)).join(", ")
      : "*";
    const where = this.conditions.length > 0 ? ` WHERE ${this.conditions.join(" AND ")}` : "";
    const limit = Number.isInteger(this.limitCount) ? ` LIMIT ${this.limitCount}` : "";
    const result = await this.executeSql(`SELECT ${columns} FROM ${escapeIdentifier(this.tableName)}${where}${limit}`);
    return result.rows || [];
  }

  async executeTakeFirst() {
    if (!Number.isInteger(this.limitCount)) this.limitCount = 1;
    const rows = await this.execute();
    return rows[0];
  }
}

class InsertQueryBuilder {
  constructor(tableName, executeSql) {
    this.tableName = tableName;
    this.executeSql = executeSql;
    this.rows = [];
  }

  values(values) {
    this.rows = Array.isArray(values) ? [...values] : [values];
    return this;
  }

  async execute() {
    if (this.rows.length === 0) return { rows: [] };
    const columns = Object.keys(this.rows[0]);
    const columnSql = columns.map((column) => escapeIdentifier(column)).join(", ");
    const valueSql = this.rows.map((row) => `(${columns.map((column) => renderSqlValue(row[column])).join(", ")})`).join(", ");
    return this.executeSql(`INSERT INTO ${escapeIdentifier(this.tableName)} (${columnSql}) VALUES ${valueSql}`);
  }
}

class UpdateQueryBuilder {
  constructor(tableName, executeSql) {
    this.tableName = tableName;
    this.executeSql = executeSql;
    this.assignments = {};
    this.conditions = [];
  }

  set(values) {
    this.assignments = { ...this.assignments, ...values };
    return this;
  }

  where(column, operator, value) {
    this.conditions.push(renderWhereClause(column, operator, value));
    return this;
  }

  async execute() {
    const assignmentSql = Object.entries(this.assignments)
      .map(([column, value]) => `${escapeIdentifier(column)} = ${renderSqlValue(value)}`)
      .join(", ");
    const where = this.conditions.length > 0 ? ` WHERE ${this.conditions.join(" AND ")}` : "";
    return this.executeSql(`UPDATE ${escapeIdentifier(this.tableName)} SET ${assignmentSql}${where}`);
  }
}

class DeleteQueryBuilder {
  constructor(tableName, executeSql) {
    this.tableName = tableName;
    this.executeSql = executeSql;
    this.conditions = [];
  }

  where(column, operator, value) {
    this.conditions.push(renderWhereClause(column, operator, value));
    return this;
  }

  async execute() {
    const where = this.conditions.length > 0 ? ` WHERE ${this.conditions.join(" AND ")}` : "";
    return this.executeSql(`DELETE FROM ${escapeIdentifier(this.tableName)}${where}`);
  }
}

class ColumnBuilder {
  constructor(name, type) {
    this.name = name;
    this.type = type instanceof RawSql ? type : new RawSql(type);
    this.isNotNull = false;
    this.isPrimaryKey = false;
    this.defaultValue = undefined;
  }

  notNull() {
    this.isNotNull = true;
    return this;
  }

  primaryKey() {
    this.isPrimaryKey = true;
    return this;
  }

  defaultTo(value) {
    this.defaultValue = value;
    return this;
  }

  build() {
    const parts = [
      escapeIdentifier(this.name),
      this.type.text,
    ];

    if (this.isNotNull) parts.push("NOT NULL");
    if (this.isPrimaryKey) parts.push("PRIMARY KEY");
    if (this.defaultValue !== undefined) parts.push(`DEFAULT ${renderSqlValue(this.defaultValue)}`);

    return parts.join(" ");
  }
}

class CreateTableBuilder {
  constructor(tableName, executeSql) {
    this.tableName = tableName;
    this.executeSql = executeSql;
    this.columns = [];
    this.ifNotExistsEnabled = false;
    this.tableSuffix = "";
  }

  ifNotExists() {
    this.ifNotExistsEnabled = true;
    return this;
  }

  addColumn(name, type, callback) {
    const column = new ColumnBuilder(name, type);
    if (typeof callback === "function") callback(column);
    this.columns.push(column);
    return this;
  }

  modifyEnd(value) {
    this.tableSuffix = value instanceof RawSql ? value.text : String(value || "");
    return this;
  }

  async execute() {
    const ifNotExists = this.ifNotExistsEnabled ? " IF NOT EXISTS" : "";
    const columnSql = this.columns.map((column) => column.build()).join(", ");
    const suffix = this.tableSuffix ? ` ${this.tableSuffix}` : "";
    await this.executeSql(`CREATE TABLE${ifNotExists} ${escapeIdentifier(this.tableName)} (${columnSql})${suffix}`);
  }
}

class AlterTableBuilder {
  constructor(tableName, executeSql) {
    this.tableName = tableName;
    this.executeSql = executeSql;
    this.actions = [];
  }

  addColumn(name, type, callback) {
    const column = new ColumnBuilder(name, type);
    if (typeof callback === "function") callback(column);
    this.actions.push(`ADD COLUMN ${column.build()}`);
    return this;
  }

  dropColumn(name) {
    this.actions.push(`DROP COLUMN ${escapeIdentifier(name)}`);
    return this;
  }

  async execute() {
    if (this.actions.length === 0) return;
    await this.executeSql(`ALTER TABLE ${escapeIdentifier(this.tableName)} ${this.actions.join(", ")}`);
  }
}

class DropTableBuilder {
  constructor(tableName, executeSql) {
    this.tableName = tableName;
    this.executeSql = executeSql;
    this.ifExistsEnabled = false;
  }

  ifExists() {
    this.ifExistsEnabled = true;
    return this;
  }

  async execute() {
    const ifExists = this.ifExistsEnabled ? " IF EXISTS" : "";
    await this.executeSql(`DROP TABLE${ifExists} ${escapeIdentifier(this.tableName)}`);
  }
}

class CreateIndexBuilder {
  constructor(indexName, executeSql) {
    this.indexName = indexName;
    this.executeSql = executeSql;
    this.tableName = "";
    this.columnNames = [];
    this.isUnique = false;
  }

  on(tableName) {
    this.tableName = tableName;
    return this;
  }

  column(name) {
    this.columnNames = [name];
    return this;
  }

  columns(names) {
    this.columnNames = [...names];
    return this;
  }

  unique() {
    this.isUnique = true;
    return this;
  }

  async execute() {
    const unique = this.isUnique ? "UNIQUE " : "";
    const columns = this.columnNames.map((name) => escapeIdentifier(name)).join(", ");
    await this.executeSql(`CREATE ${unique}INDEX ${escapeIdentifier(this.indexName)} ON ${escapeIdentifier(this.tableName)} (${columns})`);
  }
}

class DropIndexBuilder {
  constructor(indexName, executeSql) {
    this.indexName = indexName;
    this.executeSql = executeSql;
    this.tableName = "";
    this.ifExistsEnabled = false;
  }

  on(tableName) {
    this.tableName = tableName;
    return this;
  }

  ifExists() {
    this.ifExistsEnabled = true;
    return this;
  }

  async execute() {
    const ifExists = this.ifExistsEnabled ? " IF EXISTS" : "";
    await this.executeSql(`DROP INDEX${ifExists} ${escapeIdentifier(this.indexName)} ON ${escapeIdentifier(this.tableName)}`);
  }
}

class SchemaBuilder {
  constructor(executeSql) {
    this.executeSql = executeSql;
  }

  createTable(tableName) {
    return new CreateTableBuilder(tableName, this.executeSql);
  }

  alterTable(tableName) {
    return new AlterTableBuilder(tableName, this.executeSql);
  }

  dropTable(tableName) {
    return new DropTableBuilder(tableName, this.executeSql);
  }

  createIndex(indexName) {
    return new CreateIndexBuilder(indexName, this.executeSql);
  }

  dropIndex(indexName) {
    return new DropIndexBuilder(indexName, this.executeSql);
  }
}

let dataApiDbFactory = null;

export function createMigrationDbContext(executeSql) {
  return {
    executeSql,
    selectFrom(tableName) {
      return new SelectQueryBuilder(tableName, executeSql);
    },
    insertInto(tableName) {
      return new InsertQueryBuilder(tableName, executeSql);
    },
    updateTable(tableName) {
      return new UpdateQueryBuilder(tableName, executeSql);
    },
    deleteFrom(tableName) {
      return new DeleteQueryBuilder(tableName, executeSql);
    },
    async destroy() {
      // Kysely destroy() closes pooled DB resources. The Data API runner is stateless.
    },
    schema: new SchemaBuilder(executeSql),
  };
}

export function setDataApiDbFactory(factory) {
  dataApiDbFactory = typeof factory === "function" ? factory : null;
}

export function createKysely(moduleName) {
  if (typeof dataApiDbFactory !== "function") {
    throw new Error("Data API Kysely factory is not configured.");
  }
  return dataApiDbFactory(moduleName);
}

export function sql(strings, ...values) {
  if (!Array.isArray(strings) || !Object.prototype.hasOwnProperty.call(strings, "raw")) {
    return new RawSql(strings);
  }

  let text = "";
  for (let index = 0; index < strings.length; index += 1) {
    text += strings[index];
    if (index < values.length) text += renderSqlValue(values[index]);
  }
  return new RawSql(text);
}

sql.raw = function raw(text) {
  return new RawSql(text);
};
