import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function getArg(name, fallback = "") {
  const prefix = `--${name}=`;
  const bareFlag = `--${name}`;
  for (let index = 0; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    if (arg.startsWith(prefix)) return arg.slice(prefix.length);
    if (arg === bareFlag) {
      const next = process.argv[index + 1];
      if (next !== undefined && !next.startsWith("--")) return next;
    }
  }
  const envName = name.toUpperCase().replace(/-/g, "_");
  return process.env[envName] ?? process.env[name.toUpperCase()] ?? fallback;
}

function parseBoolean(value, fallback) {
  if (value === "") return fallback;
  return String(value).toLowerCase() === "true";
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function loadJsonFile(filePath, label) {
  try {
    const resolved = path.resolve(rootDir, filePath);
    return JSON.parse(fs.readFileSync(resolved, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(`Could not load ${label} "${filePath}": ${message}`);
  }
}

function normalizeOutputs(raw) {
  if (!raw) return {};
  if (Array.isArray(raw)) return Object.fromEntries(raw.map((output) => [output.OutputKey, output.OutputValue]));
  if (raw.Stacks?.[0]?.Outputs) return normalizeOutputs(raw.Stacks[0].Outputs);
  if (raw.Outputs) return normalizeOutputs(raw.Outputs);
  return raw;
}

function runAwsJson(args, failureLabel) {
  try {
    return JSON.parse(execFileSync("aws", args, {
      cwd: rootDir,
      encoding: "utf8",
      stdio: "pipe",
      maxBuffer: 20 * 1024 * 1024,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(`${failureLabel}: ${message}`);
  }
}

function getStackOutputs(stackName, region) {
  const response = runAwsJson([
    "cloudformation",
    "describe-stacks",
    "--stack-name",
    stackName,
    "--region",
    region,
    "--output",
    "json",
  ], `Could not read stack "${stackName}"`);

  return normalizeOutputs(response);
}

function getSecretJson(secretId, region) {
  const result = runAwsJson([
    "secretsmanager",
    "get-secret-value",
    "--secret-id",
    secretId,
    "--region",
    region,
    "--output",
    "json",
  ], `Could not read Secrets Manager secret "${secretId}"`);

  if (!result.SecretString) fail(`Secret does not contain SecretString: ${secretId}`);

  try {
    return JSON.parse(result.SecretString);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(`SecretString for "${secretId}" is not valid JSON: ${message}`);
  }
}

function requireValue(name, value) {
  if (!value) fail(`Missing required value: ${name}`);
  return value;
}

function escapeSqlString(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "''");
}

function sqlValue(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${escapeSqlString(value)}'`;
}

function sqlOptionalString(value) {
  if (value === null || value === undefined || value === "") return "NULL";
  return sqlValue(value);
}

function randomId(length = 11) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.randomBytes(length);
  let result = "";
  for (let index = 0; index < length; index += 1) {
    result += alphabet[bytes[index] % alphabet.length];
  }
  return result;
}

function slugifySubdomain(input) {
  return String(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 99);
}

function decodeField(field) {
  if (!field || typeof field !== "object") return null;
  if (field.isNull) return null;
  if ("stringValue" in field) return field.stringValue;
  if ("longValue" in field) return field.longValue;
  if ("doubleValue" in field) return field.doubleValue;
  if ("booleanValue" in field) return field.booleanValue;
  return null;
}

function executeStatement({ region, resourceArn, secretArn, database, sql, transactionId, includeResultMetadata = false }) {
  const args = [
    "rds-data",
    "execute-statement",
    "--region",
    region,
    "--resource-arn",
    resourceArn,
    "--secret-arn",
    secretArn,
    "--database",
    database,
    "--sql",
    sql,
    "--output",
    "json",
  ];
  if (transactionId) {
    args.push("--transaction-id", transactionId);
  }
  if (includeResultMetadata) {
    args.push("--include-result-metadata");
  }
  return runAwsJson(args, "Could not execute bootstrap SQL statement");
}

function queryRows(context, sql) {
  const result = executeStatement({ ...context, sql, includeResultMetadata: true });
  const columns = (result.columnMetadata || []).map((column) => column.name || "");
  const records = result.records || [];
  return records.map((record) => {
    const row = {};
    record.forEach((field, index) => {
      row[columns[index] || `column${index + 1}`] = decodeField(field);
    });
    return row;
  });
}

function beginTransaction({ region, resourceArn, secretArn, database }) {
  const result = runAwsJson([
    "rds-data",
    "begin-transaction",
    "--region",
    region,
    "--resource-arn",
    resourceArn,
    "--secret-arn",
    secretArn,
    "--database",
    database,
    "--output",
    "json",
  ], "Could not start bootstrap transaction");
  return result.transactionId;
}

function commitTransaction({ region, resourceArn, secretArn, transactionId }) {
  runAwsJson([
    "rds-data",
    "commit-transaction",
    "--region",
    region,
    "--resource-arn",
    resourceArn,
    "--secret-arn",
    secretArn,
    "--transaction-id",
    transactionId,
    "--output",
    "json",
  ], "Could not commit bootstrap transaction");
}

function rollbackTransaction({ region, resourceArn, secretArn, transactionId }) {
  try {
    runAwsJson([
      "rds-data",
      "rollback-transaction",
      "--region",
      region,
      "--resource-arn",
      resourceArn,
      "--secret-arn",
      secretArn,
      "--transaction-id",
      transactionId,
      "--output",
      "json",
    ], "Could not roll back bootstrap transaction");
  } catch (_error) {
    // Best-effort rollback only.
  }
}

function ensureSingleRolePermission(context, { churchId, roleId, apiName, contentType, action }) {
  const roleClause = roleId ? `roleId=${sqlValue(roleId)}` : "roleId IS NULL";
  const existing = queryRows(context, `
    SELECT id
    FROM rolePermissions
    WHERE churchId=${sqlValue(churchId)}
      AND ${roleClause}
      AND apiName=${sqlValue(apiName)}
      AND contentType=${sqlValue(contentType)}
      AND action=${sqlValue(action)}
    LIMIT 1
  `);

  if (existing.length > 0) return { id: existing[0].id, created: false };

  const id = randomId();
  executeStatement({
    ...context,
    sql: `
      INSERT INTO rolePermissions (id, churchId, roleId, apiName, contentType, contentId, action)
      VALUES (${sqlValue(id)}, ${sqlValue(churchId)}, ${roleId ? sqlValue(roleId) : "NULL"}, ${sqlValue(apiName)}, ${sqlValue(contentType)}, NULL, ${sqlValue(action)})
    `,
  });
  return { id, created: true };
}

function main() {
  const region = getArg("region", process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1");
  const stackName = getArg("stack-name");
  const outputsFile = getArg("outputs-file");
  const dbClusterArn = getArg("db-cluster-arn");
  const dbSecretArn = getArg("db-secret-arn");
  const bootstrapSecretFile = getArg("bootstrap-admin-secret-file");
  const bootstrapSecretArn = getArg("bootstrap-admin-secret-arn");
  const dryRun = parseBoolean(getArg("dry-run", "false"), false);
  const resetPassword = parseBoolean(getArg("bootstrap-admin-reset-password", "true"), true);
  const outputMode = getArg("output", "text").toLowerCase();
  const jsonOutput = outputMode === "json";

  if (!stackName && !outputsFile) {
    fail("Provide --stack-name or --outputs-file.");
  }

  const outputs = stackName
    ? getStackOutputs(stackName, region)
    : normalizeOutputs(loadJsonFile(outputsFile, "stack outputs file"));

  const resolvedDbClusterArn = dbClusterArn || outputs.DatabaseClusterArn || "";
  const resolvedDbSecretArn = dbSecretArn || outputs.DatabaseSecretArn || "";
  const membershipDatabaseName = outputs.MembershipDatabaseName || outputs.DatabaseName || "membership";

  requireValue("db-cluster-arn or DatabaseClusterArn output", resolvedDbClusterArn);
  requireValue("db-secret-arn or DatabaseSecretArn output", resolvedDbSecretArn);

  let bootstrapSecret = {};
  if (bootstrapSecretFile) bootstrapSecret = loadJsonFile(bootstrapSecretFile, "bootstrap admin secret file");
  else if (bootstrapSecretArn) bootstrapSecret = getSecretJson(bootstrapSecretArn, region);

  const adminEmail = getArg("bootstrap-admin-email", bootstrapSecret.email || "").trim().toLowerCase();
  const adminPassword = getArg("bootstrap-admin-password", bootstrapSecret.password || "");
  const adminFirstName = getArg("bootstrap-admin-first-name", bootstrapSecret.firstName || "Admin").trim();
  const adminLastName = getArg("bootstrap-admin-last-name", bootstrapSecret.lastName || "User").trim();
  const adminDisplayName = getArg(
    "bootstrap-admin-display-name",
    bootstrapSecret.displayName || `${adminFirstName} ${adminLastName}`.trim()
  ).trim();
  const churchName = getArg("bootstrap-church-name", bootstrapSecret.churchName || "").trim();
  const churchSubdomain = getArg(
    "bootstrap-church-subdomain",
    bootstrapSecret.churchSubdomain || slugifySubdomain(churchName)
  ).trim().toLowerCase();
  const churchAddress1 = getArg("bootstrap-church-address1", bootstrapSecret.address1 || "");
  const churchAddress2 = getArg("bootstrap-church-address2", bootstrapSecret.address2 || "");
  const churchCity = getArg("bootstrap-church-city", bootstrapSecret.city || "");
  const churchState = getArg("bootstrap-church-state", bootstrapSecret.state || "");
  const churchZip = getArg("bootstrap-church-zip", bootstrapSecret.zip || "");
  const churchCountry = getArg("bootstrap-church-country", bootstrapSecret.country || "USA");
  const membershipStatus = getArg("bootstrap-membership-status", bootstrapSecret.membershipStatus || "Staff");

  requireValue("bootstrap-admin-email", adminEmail);
  requireValue("bootstrap-admin-password", adminPassword);
  requireValue("bootstrap-church-name", churchName);
  requireValue("bootstrap-church-subdomain", churchSubdomain);

  if (!/^[a-z0-9]{1,99}$/.test(churchSubdomain)) {
    fail(`bootstrap-church-subdomain must contain only lowercase letters and numbers: "${churchSubdomain}"`);
  }

  const summary = {
    ok: true,
    stackName,
    outputsFile,
    region,
    dryRun,
    resetPassword,
    databaseClusterArn: resolvedDbClusterArn,
    databaseSecretArn: resolvedDbSecretArn,
    membershipDatabaseName,
    bootstrapSecretSource: bootstrapSecretFile
      ? path.resolve(rootDir, bootstrapSecretFile)
      : bootstrapSecretArn || "<direct-args>",
    adminEmail,
    adminDisplayName,
    churchName,
    churchSubdomain,
    membershipStatus,
    created: {
      church: false,
      user: false,
      person: false,
      userChurch: false,
      domainAdminsRole: false,
      allMembersRole: false,
      domainAdminMembership: false,
      allMembersMembership: false,
      everyoneEditSelfPermission: false,
      everyoneAttendancePermission: false,
      domainAdminPermission: false,
      allMembersPermission: false,
    },
    updated: {
      church: false,
      user: false,
      person: false,
      userChurch: false,
    },
    ids: {},
  };

  if (dryRun) {
    if (jsonOutput) {
      process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
      return;
    }

    console.log("\nBootstrap initial admin helper ready.");
    console.log(`Admin email: ${adminEmail}`);
    console.log(`Church: ${churchName} (${churchSubdomain})`);
    console.log(`Database: ${membershipDatabaseName}`);
    console.log("Dry run only. No changes were made.");
    return;
  }

  const hashedPassword = bcrypt.hashSync(adminPassword, 10);
  const transactionId = beginTransaction({
    region,
    resourceArn: resolvedDbClusterArn,
    secretArn: resolvedDbSecretArn,
    database: membershipDatabaseName,
  });
  const context = {
    region,
    resourceArn: resolvedDbClusterArn,
    secretArn: resolvedDbSecretArn,
    database: membershipDatabaseName,
    transactionId,
  };

  try {
    let churchRow = queryRows(context, `
      SELECT id, name, subDomain
      FROM churches
      WHERE subDomain=${sqlValue(churchSubdomain)}
      LIMIT 1
    `)[0];

    if (!churchRow) {
      const churchId = randomId();
      executeStatement({
        ...context,
        sql: `
          INSERT INTO churches (id, name, subDomain, registrationDate, address1, address2, city, state, zip, country)
          VALUES (
            ${sqlValue(churchId)},
            ${sqlValue(churchName)},
            ${sqlValue(churchSubdomain)},
            NOW(),
            ${sqlOptionalString(churchAddress1)},
            ${sqlOptionalString(churchAddress2)},
            ${sqlOptionalString(churchCity)},
            ${sqlOptionalString(churchState)},
            ${sqlOptionalString(churchZip)},
            ${sqlOptionalString(churchCountry)}
          )
        `,
      });
      churchRow = { id: churchId, name: churchName, subDomain: churchSubdomain };
      summary.created.church = true;
    } else {
      executeStatement({
        ...context,
        sql: `
          UPDATE churches
          SET
            name=${sqlValue(churchName)},
            address1=${sqlOptionalString(churchAddress1)},
            address2=${sqlOptionalString(churchAddress2)},
            city=${sqlOptionalString(churchCity)},
            state=${sqlOptionalString(churchState)},
            zip=${sqlOptionalString(churchZip)},
            country=${sqlOptionalString(churchCountry)},
            archivedDate=NULL
          WHERE id=${sqlValue(churchRow.id)}
        `,
      });
      summary.updated.church = true;
    }
    summary.ids.churchId = churchRow.id;

    let userRow = queryRows(context, `
      SELECT id
      FROM users
      WHERE email=${sqlValue(adminEmail)}
      LIMIT 1
    `)[0];

    if (!userRow) {
      const userId = randomId();
      executeStatement({
        ...context,
        sql: `
          INSERT INTO users (id, email, password, authGuid, displayName, registrationDate, lastLogin, firstName, lastName)
          VALUES (
            ${sqlValue(userId)},
            ${sqlValue(adminEmail)},
            ${sqlValue(hashedPassword)},
            '',
            ${sqlValue(adminDisplayName)},
            NOW(),
            NULL,
            ${sqlValue(adminFirstName)},
            ${sqlValue(adminLastName)}
          )
        `,
      });
      userRow = { id: userId };
      summary.created.user = true;
    } else {
      const updateSegments = [
        `email=${sqlValue(adminEmail)}`,
        `displayName=${sqlValue(adminDisplayName)}`,
        `firstName=${sqlValue(adminFirstName)}`,
        `lastName=${sqlValue(adminLastName)}`,
      ];
      if (resetPassword) updateSegments.push(`password=${sqlValue(hashedPassword)}`);
      executeStatement({
        ...context,
        sql: `
          UPDATE users
          SET ${updateSegments.join(", ")}
          WHERE id=${sqlValue(userRow.id)}
        `,
      });
      summary.updated.user = true;
    }
    summary.ids.userId = userRow.id;

    let domainAdminsRole = queryRows(context, `
      SELECT id
      FROM roles
      WHERE churchId=${sqlValue(churchRow.id)}
        AND name='Domain Admins'
      LIMIT 1
    `)[0];
    if (!domainAdminsRole) {
      const roleId = randomId();
      executeStatement({
        ...context,
        sql: `
          INSERT INTO roles (id, churchId, name)
          VALUES (${sqlValue(roleId)}, ${sqlValue(churchRow.id)}, 'Domain Admins')
        `,
      });
      domainAdminsRole = { id: roleId };
      summary.created.domainAdminsRole = true;
    }

    let allMembersRole = queryRows(context, `
      SELECT id
      FROM roles
      WHERE churchId=${sqlValue(churchRow.id)}
        AND name='All Members'
      LIMIT 1
    `)[0];
    if (!allMembersRole) {
      const roleId = randomId();
      executeStatement({
        ...context,
        sql: `
          INSERT INTO roles (id, churchId, name)
          VALUES (${sqlValue(roleId)}, ${sqlValue(churchRow.id)}, 'All Members')
        `,
      });
      allMembersRole = { id: roleId };
      summary.created.allMembersRole = true;
    }

    summary.ids.domainAdminsRoleId = domainAdminsRole.id;
    summary.ids.allMembersRoleId = allMembersRole.id;

    const domainAdminPermission = ensureSingleRolePermission(context, {
      churchId: churchRow.id,
      roleId: domainAdminsRole.id,
      apiName: "MembershipApi",
      contentType: "Domain",
      action: "Admin",
    });
    summary.ids.domainAdminPermissionId = domainAdminPermission.id;
    summary.created.domainAdminPermission = domainAdminPermission.created;

    const allMembersPermissionRows = queryRows(context, `
      SELECT id
      FROM rolePermissions
      WHERE churchId=${sqlValue(churchRow.id)}
        AND roleId=${sqlValue(allMembersRole.id)}
        AND apiName='MembershipApi'
        AND contentType='People'
        AND action='View Members'
      LIMIT 1
    `);
    if (allMembersPermissionRows.length === 0) {
      const permissionId = randomId();
      executeStatement({
        ...context,
        sql: `
          INSERT INTO rolePermissions (id, churchId, roleId, apiName, contentType, contentId, action)
          VALUES (${sqlValue(permissionId)}, ${sqlValue(churchRow.id)}, ${sqlValue(allMembersRole.id)}, 'MembershipApi', 'People', NULL, 'View Members')
        `,
      });
      summary.created.allMembersPermission = true;
      summary.ids.allMembersPermissionId = permissionId;
    } else {
      summary.ids.allMembersPermissionId = allMembersPermissionRows[0].id;
    }

    const everyoneEditSelfRows = queryRows(context, `
      SELECT id
      FROM rolePermissions
      WHERE churchId=${sqlValue(churchRow.id)}
        AND roleId IS NULL
        AND apiName='MembershipApi'
        AND contentType='People'
        AND action='Edit Self'
      LIMIT 1
    `);
    if (everyoneEditSelfRows.length === 0) {
      const permissionId = randomId();
      executeStatement({
        ...context,
        sql: `
          INSERT INTO rolePermissions (id, churchId, roleId, apiName, contentType, contentId, action)
          VALUES (${sqlValue(permissionId)}, ${sqlValue(churchRow.id)}, NULL, 'MembershipApi', 'People', NULL, 'Edit Self')
        `,
      });
      summary.created.everyoneEditSelfPermission = true;
      summary.ids.everyoneEditSelfPermissionId = permissionId;
    } else {
      summary.ids.everyoneEditSelfPermissionId = everyoneEditSelfRows[0].id;
    }

    const everyoneAttendanceRows = queryRows(context, `
      SELECT id
      FROM rolePermissions
      WHERE churchId=${sqlValue(churchRow.id)}
        AND roleId IS NULL
        AND apiName='AttendanceApi'
        AND contentType='Attendance'
        AND action='Checkin'
      LIMIT 1
    `);
    if (everyoneAttendanceRows.length === 0) {
      const permissionId = randomId();
      executeStatement({
        ...context,
        sql: `
          INSERT INTO rolePermissions (id, churchId, roleId, apiName, contentType, contentId, action)
          VALUES (${sqlValue(permissionId)}, ${sqlValue(churchRow.id)}, NULL, 'AttendanceApi', 'Attendance', NULL, 'Checkin')
        `,
      });
      summary.created.everyoneAttendancePermission = true;
      summary.ids.everyoneAttendancePermissionId = permissionId;
    } else {
      summary.ids.everyoneAttendancePermissionId = everyoneAttendanceRows[0].id;
    }

    let personRow = queryRows(context, `
      SELECT id
      FROM people
      WHERE churchId=${sqlValue(churchRow.id)}
        AND userId=${sqlValue(userRow.id)}
      LIMIT 1
    `)[0];

    if (!personRow) {
      personRow = queryRows(context, `
        SELECT id
        FROM people
        WHERE churchId=${sqlValue(churchRow.id)}
          AND email=${sqlValue(adminEmail)}
        LIMIT 1
      `)[0];
    }

    if (!personRow) {
      const personId = randomId();
      executeStatement({
        ...context,
        sql: `
          INSERT INTO people (id, churchId, userId, displayName, firstName, lastName, email, membershipStatus, removed)
          VALUES (
            ${sqlValue(personId)},
            ${sqlValue(churchRow.id)},
            ${sqlValue(userRow.id)},
            ${sqlValue(adminDisplayName)},
            ${sqlValue(adminFirstName)},
            ${sqlValue(adminLastName)},
            ${sqlValue(adminEmail)},
            ${sqlValue(membershipStatus)},
            b'0'
          )
        `,
      });
      personRow = { id: personId };
      summary.created.person = true;
    } else {
      executeStatement({
        ...context,
        sql: `
          UPDATE people
          SET
            userId=${sqlValue(userRow.id)},
            displayName=${sqlValue(adminDisplayName)},
            firstName=${sqlValue(adminFirstName)},
            lastName=${sqlValue(adminLastName)},
            email=${sqlValue(adminEmail)},
            membershipStatus=${sqlValue(membershipStatus)},
            removed=b'0'
          WHERE id=${sqlValue(personRow.id)}
            AND churchId=${sqlValue(churchRow.id)}
        `,
      });
      summary.updated.person = true;
    }
    summary.ids.personId = personRow.id;

    const userChurchRow = queryRows(context, `
      SELECT id
      FROM userChurches
      WHERE churchId=${sqlValue(churchRow.id)}
        AND userId=${sqlValue(userRow.id)}
      LIMIT 1
    `)[0];

    if (!userChurchRow) {
      const userChurchId = randomId();
      executeStatement({
        ...context,
        sql: `
          INSERT INTO userChurches (id, userId, churchId, personId, lastAccessed)
          VALUES (${sqlValue(userChurchId)}, ${sqlValue(userRow.id)}, ${sqlValue(churchRow.id)}, ${sqlValue(personRow.id)}, NOW())
        `,
      });
      summary.created.userChurch = true;
      summary.ids.userChurchId = userChurchId;
    } else {
      executeStatement({
        ...context,
        sql: `
          UPDATE userChurches
          SET
            personId=${sqlValue(personRow.id)},
            lastAccessed=NOW()
          WHERE id=${sqlValue(userChurchRow.id)}
        `,
      });
      summary.updated.userChurch = true;
      summary.ids.userChurchId = userChurchRow.id;
    }

    const domainRoleMemberRows = queryRows(context, `
      SELECT id
      FROM roleMembers
      WHERE churchId=${sqlValue(churchRow.id)}
        AND roleId=${sqlValue(domainAdminsRole.id)}
        AND userId=${sqlValue(userRow.id)}
      LIMIT 1
    `);
    if (domainRoleMemberRows.length === 0) {
      const roleMemberId = randomId();
      executeStatement({
        ...context,
        sql: `
          INSERT INTO roleMembers (id, churchId, roleId, userId, dateAdded, addedBy)
          VALUES (${sqlValue(roleMemberId)}, ${sqlValue(churchRow.id)}, ${sqlValue(domainAdminsRole.id)}, ${sqlValue(userRow.id)}, NOW(), ${sqlValue(userRow.id)})
        `,
      });
      summary.created.domainAdminMembership = true;
      summary.ids.domainAdminMembershipId = roleMemberId;
    } else {
      summary.ids.domainAdminMembershipId = domainRoleMemberRows[0].id;
    }

    const allMembersRoleMemberRows = queryRows(context, `
      SELECT id
      FROM roleMembers
      WHERE churchId=${sqlValue(churchRow.id)}
        AND roleId=${sqlValue(allMembersRole.id)}
        AND userId=${sqlValue(userRow.id)}
      LIMIT 1
    `);
    if (allMembersRoleMemberRows.length === 0) {
      const roleMemberId = randomId();
      executeStatement({
        ...context,
        sql: `
          INSERT INTO roleMembers (id, churchId, roleId, userId, dateAdded, addedBy)
          VALUES (${sqlValue(roleMemberId)}, ${sqlValue(churchRow.id)}, ${sqlValue(allMembersRole.id)}, ${sqlValue(userRow.id)}, NOW(), ${sqlValue(userRow.id)})
        `,
      });
      summary.created.allMembersMembership = true;
      summary.ids.allMembersMembershipId = roleMemberId;
    } else {
      summary.ids.allMembersMembershipId = allMembersRoleMemberRows[0].id;
    }

    commitTransaction({
      region,
      resourceArn: resolvedDbClusterArn,
      secretArn: resolvedDbSecretArn,
      transactionId,
    });
  } catch (error) {
    rollbackTransaction({
      region,
      resourceArn: resolvedDbClusterArn,
      secretArn: resolvedDbSecretArn,
      transactionId,
    });
    throw error;
  }

  if (jsonOutput) {
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    return;
  }

  console.log("\nBootstrap initial admin complete.");
  console.log(`Admin email: ${summary.adminEmail}`);
  console.log(`Church: ${summary.churchName} (${summary.churchSubdomain})`);
  console.log(`Membership database: ${summary.membershipDatabaseName}`);
  console.log(`Reset password on rerun: ${summary.resetPassword ? "yes" : "no"}`);
}

main();
