import neo4jDriver, { Driver } from "neo4j-driver";
import { env } from "../env.js";

let driver: Driver;

export function getNeo4jDriver(): Driver {
    if (!driver) {
        driver = neo4jDriver.driver(
            env.NEO4J_URI,
            neo4jDriver.auth.basic(env.NEO4J_USER, env.NEO4J_PASS)
        );
    }
    return driver;
}

export async function connectNeo4j(): Promise<void> {
    try {
        const d = getNeo4jDriver();
        const info = await d.getServerInfo();
        console.log("[Neo4j] Connected to", info.address);
    } catch (err) {
        console.error("[Neo4j] Connection failed:", err);
        process.exit(1);
    }
}

export async function closeNeo4j(): Promise<void> {
    if (driver) {
        await driver.close();
    }
}
