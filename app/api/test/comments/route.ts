export async function GET() {
  return Response.json({ comments: [{ id: 1, text: 'Comment 1' }] });
}

export async function POST(request: Request) {
  const body = await request.json();
  return Response.json({ id: 1, ...body }, { status: 201 });
}

