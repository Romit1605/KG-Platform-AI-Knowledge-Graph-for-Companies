import { Router, Request, Response } from "express";
import { optionalJWT } from "../middleware/auth.js";
import { DocumentModel } from "../models/Document.js";
import { DocumentVersionModel } from "../models/DocumentVersion.js";
import { IncidentModel } from "../models/Incident.js";
import { AutoDocModel } from "../models/AutoDoc.js";

const router = Router();

/* ------------------------------------------------------------------ */
/*  GET /timeline — unified workspace timeline                         */
/* ------------------------------------------------------------------ */

interface TimelineItem {
    date: string;
    type: string;
    title: string;
    description: string;
    linkUrl: string;
    tags: string[];
}

router.get(
    "/timeline",
    optionalJWT,
    async (req: Request, res: Response): Promise<void> => {
        try {
            const days = Math.min(
                parseInt((req.query.days as string) || "90", 10),
                365
            );
            const topic = req.query.topic as string | undefined;
            const docId = req.query.docId as string | undefined;
            const workspaceId = (req.query.workspaceId as string) || "default";

            const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
            const items: TimelineItem[] = [];

            const wsFilter = {
                $or: [
                    { workspaceId },
                    { workspaceId: { $exists: false } },
                    { workspaceId: "default" },
                ],
            };

            // 1) Documents created/updated
            const docFilter: Record<string, any> = {
                ...wsFilter,
                createdAt: { $gte: since },
            };
            if (topic) docFilter.tags = topic;
            if (docId) docFilter._id = docId;

            const docs = await DocumentModel.find(docFilter)
                .select("title tags createdAt source")
                .sort({ createdAt: -1 })
                .limit(100)
                .lean();

            for (const doc of docs) {
                items.push({
                    date: new Date(doc.createdAt).toISOString(),
                    type: "document_created",
                    title: `Document: ${doc.title}`,
                    description: `New document ingested${doc.source ? ` from ${doc.source}` : ""}`,
                    linkUrl: `/documents/${doc._id}/history`,
                    tags: doc.tags || [],
                });
            }

            // 2) Document versions
            const versionFilter: Record<string, any> = {
                createdAt: { $gte: since },
            };
            if (docId) versionFilter.documentId = docId;

            const versions = await DocumentVersionModel.find(versionFilter)
                .sort({ createdAt: -1 })
                .limit(100)
                .lean();

            for (const ver of versions) {
                items.push({
                    date: new Date(ver.createdAt).toISOString(),
                    type: "document_version",
                    title: `Version ${ver.versionNumber}: ${ver.title}`,
                    description: `Document updated to v${ver.versionNumber}`,
                    linkUrl: `/documents/${ver.documentId}/history`,
                    tags: [],
                });
            }

            // 3) Incidents
            const incidents = await IncidentModel.find({
                ...wsFilter,
                createdAt: { $gte: since },
                ...(topic ? { system: { $regex: topic, $options: "i" } } : {}),
            })
                .sort({ createdAt: -1 })
                .limit(50)
                .lean();

            for (const inc of incidents) {
                items.push({
                    date: new Date(inc.createdAt).toISOString(),
                    type: "incident_started",
                    title: `Incident: ${inc.title}`,
                    description: `System: ${inc.system} — Status: ${inc.status}`,
                    linkUrl: `/incidents`,
                    tags: [inc.system],
                });
                if (inc.resolvedAt) {
                    items.push({
                        date: new Date(inc.resolvedAt).toISOString(),
                        type: "incident_resolved",
                        title: `Resolved: ${inc.title}`,
                        description: `Incident resolved after ${inc.timeline?.length || 0} events`,
                        linkUrl: `/incidents`,
                        tags: [inc.system],
                    });
                }
            }

            // 4) AutoDocs
            const autoDocs = await AutoDocModel.find({
                ...wsFilter,
                createdAt: { $gte: since },
            })
                .sort({ createdAt: -1 })
                .limit(50)
                .lean();

            for (const ad of autoDocs) {
                items.push({
                    date: new Date(ad.createdAt).toISOString(),
                    type: "autodoc_published",
                    title: `AutoDoc: ${ad.title}`,
                    description: `Type: ${ad.type}`,
                    linkUrl: `/auto-docs`,
                    tags: [ad.type],
                });
            }

            // Sort all items by date descending
            items.sort(
                (a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime()
            );

            // Filter by topic in tags if specified and not already filtered
            const filtered = topic
                ? items.filter(
                      (item) =>
                          item.tags.some((t) =>
                              t.toLowerCase().includes(topic.toLowerCase())
                          ) || item.title.toLowerCase().includes(topic.toLowerCase())
                  )
                : items;

            res.json({ ok: true, timeline: filtered.slice(0, 200) });
        } catch (err: any) {
            res.status(500).json({ ok: false, error: err.message });
        }
    }
);

export default router;
