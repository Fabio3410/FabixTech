const products = [
    {
        id: "gandalf_staff",
        title: "Gandalf The White Staff",
        category: "Deko / Spielzeug",
        price: "39.95",
        specs: {
            material: "PLA",
            quality: "0.20mm",
            infill: "20% Gyroid"
        },
        description: "Detaillierter Nachbau von Gandalfs Zauberstab. Perfekt als Dekoration oder Geschenk für Herr der Ringe Fans.",
        images: [
            "/images/gandalf_1.png",
            "/images/gandalf_2.png"
        ],
        variants: [
            {
                id: "gandalf_staff_mit_beleuchtung",
                name: "Mit Beleuchtung (3 LEDs)",
                images: ["/images/gandalf_1.png"],
                price: "39.95"
            },
            {
                id: "gandalf_staff_ohne_beleuchtung",
                name: "Ohne Beleuchtung",
                images: ["/images/gandalf_2.png"],
                price: "29.95"
            }
        ]
    },
    {
        id: "spiral_cone_fidget",
        title: "Spiral Cone Fidget",
        category: "Spielzeug",
        price: "1.95",
        specs: {
            material: "PLA",
            quality: "0.20mm",
            infill: "20% Gyroid"
        },
        description: "Faszinierendes optisches Fidget-Spielzeug mit stufenlosem Spiral-Effekt.",
        images: [
            "/images/spiral_fidget_schwarz_rot_1.png",
            "/images/spiral_fidget_schwarz_rot_2.png",
            "/images/spiral_fidget_schwarz_gelb_1.png",
            "/images/spiral_fidget_schwarz_gelb_2.png",
            "/images/spiral_fidget_schwarz_weiss_1.png",
            "/images/spiral_fidget_schwarz_weiss_2.png",
            "/images/spiral_fidget_rot_weiss_1.png",
            "/images/spiral_fidget_rot_weiss_2.png"
        ],
        variants: [
            {
                id: "spiral_cone_schwarz_rot",
                name: "Schwarz/Rot",
                images: ["/images/spiral_fidget_schwarz_rot_1.png", "/images/spiral_fidget_schwarz_rot_2.png"],
                price: "1.95"
            },
            {
                id: "spiral_cone_schwarz_gelb",
                name: "Schwarz/Gelb",
                images: ["/images/spiral_fidget_schwarz_gelb_1.png", "/images/spiral_fidget_schwarz_gelb_2.png"],
                price: "1.95"
            }
        ]
    }
];
