/// <reference types="@figma/plugin-typings" />

figma.showUI(__html__, {
  width: 420,
  height: 420,
});

type ContentMap = Record<string, string>;

type PluginMessage = {
  type: 'APPLY_CONTENT';
  payload: ContentMap;
};

figma.ui.onmessage = async (message: PluginMessage) => {
  if (message.type !== 'APPLY_CONTENT') {
    return;
  }

  const result = await applyContentToTextLayers(message.payload);

  figma.ui.postMessage({
    type: 'RESULT',
    payload: result,
  });
};

async function applyContentToTextLayers(contentMap: ContentMap): Promise<string> {
  const entries = Object.entries(contentMap);

  if (entries.length === 0) {
    return '적용할 데이터가 없습니다.';
  }

  const textNodes = figma.currentPage.findAll((node) => {
    return node.type === 'TEXT' && Object.prototype.hasOwnProperty.call(contentMap, node.name);
  }) as TextNode[];

  if (textNodes.length === 0) {
    return '일치하는 Text Layer를 찾지 못했습니다.';
  }

  const updatedLayerNames: string[] = [];
  const failedLayerNames: string[] = [];

  for (const node of textNodes) {
    const nextContent = contentMap[node.name];

    try {
      await loadTextNodeFonts(node);
      node.characters = nextContent;
      updatedLayerNames.push(node.name);
    } catch (_error) {
      failedLayerNames.push(node.name);
    }
  }

  const unmatchedKeys = entries
    .map(([key]) => key)
    .filter((key) => !updatedLayerNames.includes(key) && !failedLayerNames.includes(key));

  return createResultMessage({
    updatedLayerNames,
    failedLayerNames,
    unmatchedKeys,
  });
}

async function loadTextNodeFonts(node: TextNode): Promise<void> {
  if (node.fontName === figma.mixed) {
    const fontNames = node.getRangeAllFontNames(0, node.characters.length);
    const uniqueFonts = removeDuplicateFonts(fontNames);

    await Promise.all(uniqueFonts.map((fontName) => figma.loadFontAsync(fontName)));
    return;
  }

  await figma.loadFontAsync(node.fontName);
}

function removeDuplicateFonts(fontNames: FontName[]): FontName[] {
  const fontKeySet = new Set<string>();

  return fontNames.filter((fontName) => {
    const key = `${fontName.family}-${fontName.style}`;

    if (fontKeySet.has(key)) {
      return false;
    }

    fontKeySet.add(key);
    return true;
  });
}

function createResultMessage(params: {
  updatedLayerNames: string[];
  failedLayerNames: string[];
  unmatchedKeys: string[];
}): string {
  const { updatedLayerNames, failedLayerNames, unmatchedKeys } = params;

  const lines = [
    `업데이트 완료: ${updatedLayerNames.length}개`,
    `업데이트 실패: ${failedLayerNames.length}개`,
    `매칭 실패 key: ${unmatchedKeys.length}개`,
  ];

  if (updatedLayerNames.length > 0) {
    lines.push('', '[업데이트된 레이어]');
    lines.push(...updatedLayerNames.map((name) => `- ${name}`));
  }

  if (failedLayerNames.length > 0) {
    lines.push('', '[실패한 레이어]');
    lines.push(...failedLayerNames.map((name) => `- ${name}`));
  }

  if (unmatchedKeys.length > 0) {
    lines.push('', '[Figma에서 찾지 못한 key]');
    lines.push(...unmatchedKeys.map((key) => `- ${key}`));
  }

  return lines.join('\n');
}
