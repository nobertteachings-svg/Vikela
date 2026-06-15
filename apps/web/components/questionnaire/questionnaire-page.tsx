"use client";

import { useState } from "react";
import { IconUpload } from "@tabler/icons-react";
import { PageHeader } from "@/components/comply/page-header";
import { Card, CardBody } from "@/components/comply/card";
import { DataTable } from "@/components/comply/data-table";
import { apiPost, apiPatch } from "@/lib/api";

type Item = { id: string; q: string; answer: string; status: string };

export function QuestionnairePageContent({
  initial,
}: {
  initial: {
    id: string;
    title: string;
    items: Item[];
  } | null;
}) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(false);

  async function handleUpload() {
    setLoading(true);
    try {
      const created = await apiPost<{
        id: string;
        title: string;
        items: Item[];
      }>("/api/v1/questionnaires", { title: "Vendor security questionnaire" });
      setData(created);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  async function updateItem(itemId: string, answer: string, status: string) {
    if (!data) return;
    await apiPatch(`/api/v1/questionnaires/${data.id}/items/${itemId}`, { answer, status });
    setData({
      ...data,
      items: data.items.map((i) => (i.id === itemId ? { ...i, answer, status } : i)),
    });
  }

  return (
    <div className="comply-page">
      <PageHeader
        eyebrow="Audit"
        title="Security questionnaire"
        description="Upload vendor questionnaires and review AI-suggested answers."
      />

      {!data ? (
        <button
          type="button"
          onClick={handleUpload}
          disabled={loading}
          className="comply-empty w-full cursor-pointer transition-colors hover:border-comply-purple-border hover:bg-comply-purple/5"
        >
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-comply-purple/15 text-comply-purple-border">
            <IconUpload size={24} />
          </span>
          <p className="text-sm font-medium text-comply-text-primary">
            {loading ? "Creating questionnaire…" : "Upload questionnaire"}
          </p>
          <p className="mt-1 text-sm text-comply-text-secondary">
            PDF, CSV, or Excel — generates AI-suggested answers from your compliance posture
          </p>
        </button>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="comply-btn-primary">
              Approve all
            </button>
            <button type="button" className="comply-btn-secondary">
              Export answers
            </button>
          </div>

          <Card>
            <CardBody className="p-0 pb-1">
              <DataTable>
                <thead>
                  <tr>
                    <th className="w-[30%]">Question</th>
                    <th>AI-suggested answer</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((row) => (
                    <tr key={row.id}>
                      <td className="align-top font-medium">{row.q}</td>
                      <td className="align-top">
                        <textarea
                          defaultValue={row.answer}
                          rows={3}
                          className="comply-input min-h-[72px] resize-y"
                          onBlur={(e) => updateItem(row.id, e.target.value, row.status)}
                        />
                      </td>
                      <td className="align-top">
                        <select
                          defaultValue={row.status}
                          className="comply-input py-2"
                          onChange={(e) => updateItem(row.id, row.answer, e.target.value)}
                        >
                          <option>Approved</option>
                          <option>Edit</option>
                          <option>Skip</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
