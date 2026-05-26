/// <reference types="@figma/plugin-typings" />

figma.showUI(__html__, {
  width: 420,
  height: 480,
});

type ContentMap = Record<string, string>;

type PluginMessage =
  | { type: 'APPLY_CONTENT'; payload: ContentMap }
  | { type: 'RENAME_LAYERS'; payload: ContentMap }
  | { type: 'EXTRACT_CONTENT'; payload: ContentMap };

figma.ui.onmessage = async (message: PluginMessage) => {
  if (message.type === 'EXTRACT_CONTENT') {
    const { contentMap, summary } = extractContentFromTextLayers(message.payload);

    figma.ui.postMessage({
      type: 'EXTRACT_RESULT',
      payload: { contentMap, summary },
    });
    return;
  }

  let result: string;

  if (message.type === 'APPLY_CONTENT') {
    result = await applyContentToTextLayers(message.payload);
  } else if (message.type === 'RENAME_LAYERS') {
    result = renameLayersFromContentMap(message.payload);
  } else {
    return;
  }

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

  return createApplyResultMessage({
    updatedLayerNames,
    failedLayerNames,
    unmatchedKeys,
  });
}

function extractContentFromTextLayers(contentMap: ContentMap): {
  contentMap: ContentMap;
  summary: string;
} {
  const keys = Object.keys(contentMap);

  if (keys.length === 0) {
    return {
      contentMap: {},
      summary: '추출할 key가 없습니다. JSON에 key를 입력해 주세요.',
    };
  }

  const extractedContentMap: ContentMap = {};
  const extractedKeys: string[] = [];
  const unmatchedKeys: string[] = [];
  const ambiguousKeys: string[] = [];

  for (const key of keys) {
    const matchingNodes = figma.currentPage.findAll((node) => {
      return node.type === 'TEXT' && node.name === key;
    }) as TextNode[];

    if (matchingNodes.length === 0) {
      unmatchedKeys.push(key);
      extractedContentMap[key] = contentMap[key];
      continue;
    }

    const uniqueTexts = [...new Set(matchingNodes.map((node) => node.characters))];

    if (uniqueTexts.length > 1) {
      ambiguousKeys.push(key);
      extractedContentMap[key] = contentMap[key];
      continue;
    }

    extractedContentMap[key] = uniqueTexts[0];
    extractedKeys.push(key);
  }

  return {
    contentMap: extractedContentMap,
    summary: createExtractResultMessage({
      extractedKeys,
      unmatchedKeys,
      ambiguousKeys,
    }),
  };
}

function renameLayersFromContentMap(contentMap: ContentMap): string {
  const entries = Object.entries(contentMap);

  if (entries.length === 0) {
    return '적용할 데이터가 없습니다.';
  }

  const renamedKeys: string[] = [];
  const unmatchedKeys: string[] = [];
  const ambiguousKeys: string[] = [];

  for (const [key, value] of entries) {
    const matchingNodes = figma.currentPage.findAll((node) => {
      return node.type === 'TEXT' && node.characters === value;
    }) as TextNode[];

    if (matchingNodes.length === 0) {
      unmatchedKeys.push(key);
      continue;
    }

    if (matchingNodes.length > 1) {
      ambiguousKeys.push(key);
      continue;
    }

    matchingNodes[0].name = key;
    renamedKeys.push(key);
  }

  return createRenameResultMessage({
    renamedKeys,
    unmatchedKeys,
    ambiguousKeys,
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

function createExtractResultMessage(params: {
  extractedKeys: string[];
  unmatchedKeys: string[];
  ambiguousKeys: string[];
}): string {
  const { extractedKeys, unmatchedKeys, ambiguousKeys } = params;

  const lines = [
    `추출 완료: ${extractedKeys.length}개`,
    `매칭 실패 key: ${unmatchedKeys.length}개`,
    `중복·불일치로 스킵: ${ambiguousKeys.length}개`,
  ];

  if (extractedKeys.length > 0) {
    lines.push('', '[추출된 key]');
    lines.push(...extractedKeys.map((key) => `- ${key}`));
  }

  if (unmatchedKeys.length > 0) {
    lines.push('', '[Figma에서 찾지 못한 key]');
    lines.push(...unmatchedKeys.map((key) => `- ${key}`));
  }

  if (ambiguousKeys.length > 0) {
    lines.push('', '[동일 이름·서로 다른 텍스트로 스킵한 key]');
    lines.push(...ambiguousKeys.map((key) => `- ${key}`));
  }

  return lines.join('\n');
}

function createRenameResultMessage(params: {
  renamedKeys: string[];
  unmatchedKeys: string[];
  ambiguousKeys: string[];
}): string {
  const { renamedKeys, unmatchedKeys, ambiguousKeys } = params;

  const lines = [
    `이름 변경 완료: ${renamedKeys.length}개`,
    `매칭 실패 key: ${unmatchedKeys.length}개`,
    `중복 매칭으로 스킵: ${ambiguousKeys.length}개`,
  ];

  if (renamedKeys.length > 0) {
    lines.push('', '[이름이 변경된 key]');
    lines.push(...renamedKeys.map((key) => `- ${key}`));
  }

  if (unmatchedKeys.length > 0) {
    lines.push('', '[텍스트와 일치하는 레이어 없음]');
    lines.push(...unmatchedKeys.map((key) => `- ${key}`));
  }

  if (ambiguousKeys.length > 0) {
    lines.push('', '[중복 매칭으로 스킵한 key]');
    lines.push(...ambiguousKeys.map((key) => `- ${key}`));
  }

  return lines.join('\n');
}

function createApplyResultMessage(params: {
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
