import { initDatabase, closeDatabase } from "../../db/sqlite.js";
import { verifyReceiptChain } from "./receiptVerifier.js";

const result = verifyReceiptChain(initDatabase());
console.log(JSON.stringify(result, null, 2));
closeDatabase();
process.exitCode = result.ok ? 0 : 1;
