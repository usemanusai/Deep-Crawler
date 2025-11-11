export async function GET() {
  return Response.json({ users: [{ id: 1, name: 'User 1' }] });
}

export async function POST(request: Request) {
  const body = await request.json();
  return Response.json({ id: 1, ...body }, { status: 201 });
}

export async function PUT(request: Request) {
  const body = await request.json();
  return Response.json({ id: 1, ...body });
}

export async function DELETE() {
  return Response.json({ success: true });
}

