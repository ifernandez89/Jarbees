import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function generateStaticParams() {
  return [
    { documentId: "1" },
    { documentId: "2" },
    { documentId: "default" },
  ];
}

export async function GET(
  request: Request,
  props: { params: Promise<{ documentId: string }> }
) {
  try {
    const params = await props.params;
    const documentId = decodeURIComponent(params.documentId || "1");

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
    let documentData = null;

    // Consultar al backend principal (NestJS) en /api/reader/:documentId
    try {
      const apiToken = process.env.NEXT_PUBLIC_API_TOKEN;
      const res = await fetch(`${backendUrl}/api/reader/${encodeURIComponent(documentId)}`, {
        headers: {
          Accept: "application/json",
          "ngrok-skip-browser-warning": "69420",
          ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {}),
        },
      });

      if (res.ok) {
        documentData = await res.json();
      }
    } catch (err) {
      console.warn(`[API Reader Proxy] No se pudo conectar al backend en ${backendUrl}:`, err);
    }

    const title = documentData?.title || documentData?.titulo || documentId;
    const author = documentData?.author || documentData?.autor || "Autor Desconocido";
    const paginas = documentData?.pages || documentData?.paginas || 180;

    let blocks: string[] = [];
    if (documentData?.blocks && Array.isArray(documentData.blocks) && documentData.blocks.length > 0) {
      blocks = documentData.blocks;
    } else if (documentData?.content && Array.isArray(documentData.content)) {
      blocks = documentData.content;
    } else if (documentData?.text) {
      blocks = documentData.text.match(/[^.!?]+[.!?]+/g) || [documentData.text];
    } else {
      blocks = [
        `Capítulo 1 de ${title}. Lectura procesada desde la biblioteca JarBees.`,
        `Obra de ${author}. El texto del libro se divide progresivamente en bloques para síntesis de audio.`,
        `Mientras escuchas este fragmento, JarBees continúa procesando en segundo plano los siguientes bloques con el modelo sematre/orpheus:it_es-3b.`,
        `Puedes bloquear la pantalla de tu dispositivo y el reproductor continuará emitiendo el audiolibro sin interrupciones.`,
      ];
    }

    return NextResponse.json({
      success: true,
      documentId,
      title,
      author,
      paginas,
      blocks,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
