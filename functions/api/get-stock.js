export async function onRequestGet(context) {
    const { searchParams } = new URL(context.request.url);
    const id = searchParams.get('id'); // Holt die Produkt-ID aus der URL (z.B. ?id=fidget_normal)
    
    if (!id) {
        return new Response(JSON.stringify({ error: "Missing product id" }), { status: 400 });
    }
    const stock = await context.env.INVENTORY.get(id) || "0";
    return new Response(JSON.stringify({ id: id, stock: parseInt(stock) }), {
        headers: { 
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-cache'
        }
    });
}
