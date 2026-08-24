function hidePreloader() {
  const preloader = document.getElementById('preloader');
  if (preloader) {
    preloader.classList.add('fade-out');
    setTimeout(() => preloader.remove(), 400);
  }
}

export async function onRequestGet(context) {
    const { searchParams } = new URL(context.request.url);
    const productId = searchParams.get('id');
    
    if (!productId) {
        return new Response(JSON.stringify({ error: "Missing ID" }), { status: 400 });
    }

    try {
        const result = await context.env.DB.prepare(
            "SELECT stock FROM inventory WHERE id = ?"
        ).bind(productId).first();

        const stock = result ? parseInt(result.stock) : 0;

        return new Response(JSON.stringify({ stock }), {
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store, max-age=0'
            }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    } finally {
    hidePreloader();
  }
}


fetchStockData();
