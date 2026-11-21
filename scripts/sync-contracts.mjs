import fs from 'node:fs';
import path from 'node:path';
import openapiTS, { astToString } from 'openapi-typescript';

const ROOT_DIR = process.cwd();
const CONTRACTS_SRC_DIR = path.resolve(ROOT_DIR, 'contracts');
const CONTRACTS_OPENAPI_SRC_DIR = path.resolve(CONTRACTS_SRC_DIR, 'openapi');

const TARGET_DIR = path.resolve(ROOT_DIR, 'src/contracts');
const TARGET_OPENAPI_DIR = path.resolve(TARGET_DIR, 'openapi');
const OUTPUT_TYPES_FILE = path.resolve(TARGET_DIR, 'api.generated.ts');

async function syncContracts() {
  console.log('🔄 Starting contracts sync...');

  // 1. Ensure target directories exist
  if (!fs.existsSync(TARGET_OPENAPI_DIR)) {
    fs.mkdirSync(TARGET_OPENAPI_DIR, { recursive: true });
  }

  // 2. Copy openapi JSON files to src/contracts/openapi/
  const openapiFiles = fs.readdirSync(CONTRACTS_OPENAPI_SRC_DIR).filter(f => f.endsWith('.json'));
  for (const file of openapiFiles) {
    const srcPath = path.resolve(CONTRACTS_OPENAPI_SRC_DIR, file);
    const destPath = path.resolve(TARGET_OPENAPI_DIR, file);
    fs.copyFileSync(srcPath, destPath);
    console.log(`  ✓ Copied ${file} -> src/contracts/openapi/${file}`);
  }

  // 3. Copy socket.json if it exists
  const socketSrc = path.resolve(CONTRACTS_SRC_DIR, 'socket.json');
  if (fs.existsSync(socketSrc)) {
    fs.copyFileSync(socketSrc, path.resolve(TARGET_DIR, 'socket.json'));
    console.log('  ✓ Copied socket.json -> src/contracts/socket.json');
  }

  // 4. Merge OpenAPI definitions
  const mergedSpec = {
    openapi: '3.1.0',
    info: {
      title: 'Online Auction Unified API',
      version: '1.0.0',
      description: 'Unified OpenAPI specification merged from microservices contracts'
    },
    servers: [
      {
        url: 'http://localhost:8080',
        description: 'KrakenD API Gateway'
      }
    ],
    paths: {},
    components: {
      schemas: {},
      securitySchemes: {}
    }
  };

  for (const file of openapiFiles) {
    const filePath = path.resolve(CONTRACTS_OPENAPI_SRC_DIR, file);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // Merge paths
    if (content.paths) {
      for (const [pathKey, pathItem] of Object.entries(content.paths)) {
        if (!mergedSpec.paths[pathKey]) {
          mergedSpec.paths[pathKey] = pathItem;
        } else {
          // If path already exists, merge HTTP methods
          mergedSpec.paths[pathKey] = {
            ...mergedSpec.paths[pathKey],
            ...pathItem
          };
        }
      }
    }

    // Merge components schemas
    if (content.components?.schemas) {
      for (const [schemaName, schemaObj] of Object.entries(content.components.schemas)) {
        if (!mergedSpec.components.schemas[schemaName]) {
          mergedSpec.components.schemas[schemaName] = schemaObj;
        }
      }
    }

    // Merge security schemes
    if (content.components?.securitySchemes) {
      for (const [secName, secObj] of Object.entries(content.components.securitySchemes)) {
        if (!mergedSpec.components.securitySchemes[secName]) {
          mergedSpec.components.securitySchemes[secName] = secObj;
        }
      }
    }
  }

  console.log(`  Merged ${Object.keys(mergedSpec.paths).length} API paths and ${Object.keys(mergedSpec.components.schemas).length} schemas.`);

  // 5. Generate TypeScript AST using openapi-typescript
  const ast = await openapiTS(mergedSpec);
  let generatedCode = astToString(ast);

  // 6. Append convenient domain helper type aliases
  const helperTypes = `
// ==========================================
// Convenient Domain Types & Helper Aliases
// ==========================================

export type Schema<T extends keyof components['schemas']> = components['schemas'][T];

// Domain Models
export type User = components['schemas']['User'];
export type Tokens = components['schemas']['Tokens'];
export type Product = components['schemas']['Product'];
export type Category = components['schemas']['Category'];
export type Auction = components['schemas']['Auction'];
export type Bid = components['schemas']['Bid'];
export type Order = components['schemas']['Order'];
export type Payment = components['schemas']['Payment'];
export type Notification = components['schemas']['Notification'];
export type ApiErrorEnvelope = components['schemas']['Error'];
export type HealthStatus = components['schemas']['Health'];

// Page Envelopes
export type AuctionPage = components['schemas']['AuctionPage'];
export type BidPage = components['schemas']['BidPage'];
export type CategoryPage = components['schemas']['CategoryPage'];
export type ProductPage = components['schemas']['ProductPage'];
export type OrderPage = components['schemas']['OrderPage'];
export type NotificationPage = components['schemas']['NotificationPage'];

// Roles & Status Enums / Unions
export type UserRole = User['role'];
export type ProductCondition = Product['condition'];
export type ProductStatus = Product['status'];
export type AuctionStatus = Auction['status'];
export type OrderStatus = Order['status'];
export type PaymentMethod = 'COD' | 'VNPAY';
export type PaymentStatus = Payment['status'];
export type NotificationType = Notification['type'];
export type NotificationFilterStatus = 'UNREAD' | 'READ';

// Socket Event Payload Types (from contracts/socket.json)
export interface AuctionBidUpdatedPayload {
  auctionId: string;
  bidId?: string;
  bidderId: string;
  amount: string;
  version: number;
  placedAt?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface AuctionStatusChangedPayload {
  auctionId: string;
  status: 'ACTIVE' | 'ENDED';
  version: number;
  winnerId?: string | null;
  finalPrice?: string | null;
  startedAt?: string;
  endedAt?: string;
  [key: string]: unknown;
}

export interface AuctionSubscribeAck {
  ok: boolean;
  auctionId?: string;
  code?: string;
}
`;

  generatedCode += helperTypes;

  // 7. Write to output file
  fs.writeFileSync(OUTPUT_TYPES_FILE, generatedCode, 'utf-8');
  console.log(`✅ Successfully generated types at src/contracts/api.generated.ts (${generatedCode.length} bytes)`);
}

syncContracts().catch((err) => {
  console.error('❌ Failed to sync contracts:', err);
  process.exit(1);
});
