const fs = require('fs');
const path = require('path');

const CATALOGO_BASE = 'f:\\luna_cosmeticos\\catalogos';

async function renomearParaThumb() {
  const marcas = fs.readdirSync(CATALOGO_BASE);
  
  for (const marca of marcas) {
    const marcaPath = path.join(CATALOGO_BASE, marca);
    if (!fs.statSync(marcaPath).isDirectory()) continue;
    
    const kits = fs.readdirSync(marcaPath);
    
    for (const kit of kits) {
      const kitPath = path.join(marcaPath, kit);
      if (!fs.statSync(kitPath).isDirectory()) continue;
      
      const arquivos = fs.readdirSync(kitPath);
      
      for (const arquivo of arquivos) {
        const ext = path.extname(arquivo).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
          const antigoPath = path.join(kitPath, arquivo);
          const novoPath = path.join(kitPath, `thumb${ext}`);
          
          // Só renomeia se não for já thumb
          if (!arquivo.toLowerCase().startsWith('thumb')) {
            fs.renameSync(antigoPath, novoPath);
            console.log(`✅ ${marca}/${kit}: ${arquivo} → thumb${ext}`);
          }
        }
      }
    }
  }
  
  console.log('\n🎉 Todas as imagens foram renomeadas para thumb!');
}

renomearParaThumb();
