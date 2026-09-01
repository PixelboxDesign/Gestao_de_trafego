#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import codecs

# Lê o arquivo
with codecs.open('frontend/disparo/public/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Substitui todos os caracteres corrompidos
replacements = {
    'ÃƒÂ—Ã¶': '—',
    'Ã"Ã‡Ã¶': '—',
    'versâ"œÃºo': 'versão',
    'CatÃ¡logo': 'Catálogo',
    'HistÃ³rico': 'Histórico',
    'preÃ§o': 'preço',
    'descriÃ§Ã£o': 'descrição',
    'cÃ³digo': 'código',
    'nÃºmero': 'número',
    'imÃ¡gens': 'imagens',
    'ediÃ§Ã£o': 'edição',
    'configuraÃ§Ã£o': 'configuração',
    'informaÃ§Ãµes': 'informações',
    'â"œÃ¡': 'á',
    'â"œÃ®': 'í',
    'â"œÃ³': 'ó',
    'â"œÃº': 'ú',
    'â"œÂº': 'º',
    'â"œÃª': 'ê',
    'â"œÃ­': 'ã',
}

for old, new in replacements.items():
    content = content.replace(old, new)

# Salva sem BOM
with codecs.open('frontend/disparo/public/index.html', 'w', encoding='utf-8-sig') as f:
    f.write(content)

print('Encoding fixed!')
