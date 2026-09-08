export async function onRequestGet(context) {
    try {
        const { results } = await context.env.DB.prepare(
            "SELECT id, stock FROM inventory"
        ).all();

        return new Response(JSON.stringify(results), {
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=10'
            }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}