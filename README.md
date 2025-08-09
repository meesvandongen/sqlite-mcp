# SQLite MCP Server

A Model Context Protocol (MCP) server that provides tools and resources for interacting with SQLite databases. This server allows AI assistants to execute SQL queries and manage database schemas efficiently.

## Features

### Tools
- **get_schema**: Get complete schema information for all database tables
- **read_query**: Execute SELECT queries to read data from the database
- **write_query**: Execute INSERT, UPDATE, or DELETE queries to modify data
- **create_table**: Create new tables in the database
- **list_tables**: Show all existing tables
- **describe_table**: Show the schema for a specific table

## Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the project:
   ```bash
   npm run build
   ```

4. Run tests:
   ```bash
   npm test
   ```

## Usage

### Database Path Requirement
All tools require a database path to be explicitly provided. This ensures:
- Clear specification of which database to operate on
- Support for multiple databases
- No ambiguous default behavior

### Example Tool Calls

#### Create a Table
```json
{
  "tool": "create_table",
  "arguments": {
    "query": "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)",
    "db_path": "./my_database.db"
  }
}
```

#### Insert Data
```json
{
  "tool": "write_query",
  "arguments": {
    "query": "INSERT INTO users (name, email) VALUES ('John Doe', 'john@example.com')",
    "db_path": "./my_database.db"
  }
}
```

#### Query Data
```json
{
  "tool": "read_query",
  "arguments": {
    "query": "SELECT * FROM users WHERE name LIKE '%John%'",
    "db_path": "./my_database.db"
  }
}
```

#### Get Database Schema
```json
{
  "tool": "get_schema",
  "arguments": {
    "db_path": "./my_database.db"
  }
}
```

This returns a JSON object containing the complete schema information for all tables.

## Architecture

### Database Management
- Each operation requires explicit database path specification
- Database connections are cached and reused efficiently
- Automatic cleanup prevents resource leaks
- Support for relative and absolute paths

### Error Handling
- Comprehensive error handling for database operations
- Clear error messages for debugging
- Graceful handling of connection issues

### Security
- Query validation prevents dangerous operations
- Separate tools for read and write operations
- SQL injection protection through parameterized queries

## Development

### Testing
Run the comprehensive test suite:
```bash
npm test          # Watch mode
npm run test:run  # Single run
```

The test suite covers:
- Database operations (CREATE, INSERT, UPDATE, DELETE, SELECT)
- Error handling
- Multi-database management
- Connection management

### Building
```bash
npm run build
```

## Integration with MCP Clients

This server is designed to work with any MCP-compatible client. The clean, production-ready API provides reliable SQLite database operations for AI assistants and other automated systems.

## License

MIT License
