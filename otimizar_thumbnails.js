const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

const PASTA_CATALOGOS = path.join(__dirname, 'catalogos');
const TAMANHO_THUMB = 400; // 400x400px
const QUALIDADE = 80; // 80% qualidade

async function otimizarThumbnails() {
  console.log('🔧 OTIMIZADOR DE THUMBNAILS');
  console.log('='.repeat(70));
  console.log('');

  const marcas = await fs.readdir(PASTA_CATALOGOS);
  
  let totalProcessado = 0;
  let totalEconomizado = 0;

  for (const marca of marcas) {
    const marcaPath = path.join(PASTA_CATALOGOS, marca);
    const stat = await fs.stat(marcaPath);
    
    if (!stat.isDirectory()) continue;

    console.log(`\n📁 Marca: ${marca}`);
    console.log('─'.repeat(70));

    const kits = await fs.readdir(marcaPath);

    for (const kit of kits) {
      const kitPath = path.join(marcaPath, kit);
      const kitStat = await fs.stat(kitPath);
      
      if (!kitStat.isDirectory()) continue;

      // Procurar thumb.png ou thumb.jpg
      const arquivos = await fs.readdir(kitPath);
      const thumbs = arquivos.filter(f => f.startsWith('thumb.'));
      
      if (thumbs.length === 0) continue;

      const thumbFile = thumbs[0];
      const thumbPath = path.join(kitPath, thumbFile);
      const thumbStat = await fs.stat(thumbPath);
      const tamanhoOriginal = thumbStat.size;

      try {
        // Ler imagem original
        const buffer = await fs.readFile(thumbPath);
        
        // Fazer backup se ainda não existir
        const backupPath = path.join(kitPath, `thumb_original${path.extname(thumbFile)}`);
        try {
          await fs.access(backupPath);
        } catch {
          await fs.writeFile(backupPath, buffer);
        }

        // Otimizar
        const optimized = await sharp(buffer)
          .resize(TAMANHO_THUMB, TAMANHO_THUMB, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .png({ quality: QUALIDADE, compressionLevel: 9 })
          .toBuffer();

        // Salvar otimizada
        const novoPath = path.join(kitPath, 'thumb.png');
        await fs.writeFile(novoPath, optimized);

        // Se era .jpg, remover
        if (thumbFile.endsWith('.jpg') || thumbFile.endsWith('.jpeg')) {
          if (thumbFile !== 'thumb.png') {
            await fs.unlink(thumbPath);
          }
        }

        const tamanhoNovo = optimized.length;
        const economia = tamanhoOriginal - tamanhoNovo;
        const percentual = ((economia / tamanhoOriginal) * 100).toFixed(1);

        console.log(`  ✅ ${kit.padEnd(45)} ${(tamanhoOriginal/1024).toFixed(0).padStart(4)}KB → ${(tamanhoNovo/1024).toFixed(0).padStart(4)}KB (↓${percentual}%)`);

        totalProcessado++;
        totalEconomizado += economia;

      } catch (err) {
        console.log(`  ❌ ${kit}: ${err.message}`);
      }
    }
  }

  console.log('\n\n' + '='.repeat(70));
  console.log('✅ CONCLUÍDO!');
  console.log('='.repeat(70));
  console.log(`\n📊 Estatísticas:`);
  console.log(`   - Thumbnails processadas: ${totalProcessado}`);
  console.log(`   - Espaço economizado: ${(totalEconomizado / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   - Média por thumbnail: ${(totalEconomizado / totalProcessado / 1024).toFixed(0)} KB reduzidos`);
  console.log('');
  console.log('💾 Backups salvos como: thumb_original.png');
  console.log('');
}

// Verificar se sharp está instalado
(async () => {
  try {
    require('sharp');
    await otimizarThumbnails();
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      console.log('❌ O módulo "sharp" não está instalado!');
      console.log('');
      console.log('📦 Instale com:');
      console.log('   npm install sharp');
      console.log('');
      process.exit(1);
    } else {
      throw err;
    }
  }
})();
