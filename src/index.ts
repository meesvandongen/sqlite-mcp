import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { SqliteDatabase, getDatabase, cleanupDatabase } from "./database.js";

// Create server instance
const server = new McpServer({
  name: "sqlite-mcp-server",
  version: "1.0.0",
});

// No prompts or resources registered - production server focuses on tools

// Register SQLite tools
server.tool(
  "get_schema",
  "Get the complete schema information for all tables in the database",
  {
    db_path: z.string().describe("Path to SQLite database file"),
  },
  async ({ db_path }) => {
    try {
      const db = await getDatabase(db_path);
      const tables = await db.executeQuery("SELECT name FROM sqlite_master WHERE type='table'");
      
      const schema: any = {};
      for (const table of tables) {
        const tableInfo = await db.executeQuery(`PRAGMA table_info(${table.name})`);
        schema[table.name] = tableInfo;
      }
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(schema, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Database error: ${(error as Error).message}`,
          },
        ],
      };
    }
  }
);

server.tool(
  "read_query",
  "Execute a SELECT query on the SQLite database",
  {
    query: z.string().describe("SELECT SQL query to execute"),
    db_path: z.string().describe("Path to SQLite database file"),
  },
  async ({ query, db_path }) => {
    try {
      if (!query.trim().toUpperCase().startsWith("SELECT")) {
        throw new Error("Only SELECT queries are allowed for read_query");
      }

      const db = await getDatabase(db_path);
      const results = await db.executeQuery(query);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(results, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Database error: ${(error as Error).message}`,
          },
        ],
      };
    }
  }
);

server.tool(
  "write_query",
  "Execute an INSERT, UPDATE, or DELETE query on the SQLite database",
  {
    query: z.string().describe("SQL query to execute (INSERT, UPDATE, DELETE)"),
    db_path: z.string().describe("Path to SQLite database file"),
  },
  async ({ query, db_path }) => {
    try {
      if (query.trim().toUpperCase().startsWith("SELECT")) {
        throw new Error("SELECT queries are not allowed for write_query");
      }

      const db = await getDatabase(db_path);
      const results = await db.executeQuery(query);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(results, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Database error: ${(error as Error).message}`,
          },
        ],
      };
    }
  }
);

server.tool(
  "create_table",
  "Create a new table in the SQLite database",
  {
    query: z.string().describe("CREATE TABLE SQL statement"),
    db_path: z.string().describe("Path to SQLite database file"),
  },
  async ({ query, db_path }) => {
    try {
      if (!query.trim().toUpperCase().startsWith("CREATE TABLE")) {
        throw new Error("Only CREATE TABLE statements are allowed");
      }

      const db = await getDatabase(db_path);
      await db.executeQuery(query);
      
      return {
        content: [
          {
            type: "text",
            text: "Table created successfully",
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Database error: ${(error as Error).message}`,
          },
        ],
      };
    }
  }
);

server.tool(
  "list_tables",
  "List all tables in the SQLite database",
  {
    db_path: z.string().describe("Path to SQLite database file"),
  },
  async ({ db_path }) => {
    try {
      const db = await getDatabase(db_path);
      const results = await db.executeQuery("SELECT name FROM sqlite_master WHERE type='table'");
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(results, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Database error: ${(error as Error).message}`,
          },
        ],
      };
    }
  }
);

server.tool(
  "describe_table",
  "Get the schema information for a specific table",
  {
    table_name: z.string().describe("Name of the table to describe"),
    db_path: z.string().describe("Path to SQLite database file"),
  },
  async ({ table_name, db_path }) => {
    try {
      const db = await getDatabase(db_path);
      const results = await db.executeQuery(`PRAGMA table_info(${table_name})`);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(results, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Database error: ${(error as Error).message}`,
          },
        ],
      };
    }
  }
);



// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("SQLite MCP Server running");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});