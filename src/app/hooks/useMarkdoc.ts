import React from 'react';
import { notFound } from 'next/navigation';

import * as yaml from 'js-yaml';
import Markdoc, { Tag } from '@markdoc/markdoc';
import { slugifyWithCounter } from '@sindresorhus/slugify';

import { join } from 'path';
import { readFileSync } from 'fs';

type RenderableTreeNode = Tag<string, Record<string, any>>;

const getNodeTitle = (node: Tag) => {
  let title = '';
  const nodes = node.children as Tag[];

  for (const child of nodes ?? []) {
    if (typeof child === 'string') {
      title += child;
    }

    title += getNodeTitle(child);
  }

  return title;
};

const collectHeadings = (
  nodes: RenderableTreeNode,
  slugify = slugifyWithCounter()
): RenderableTreeNode[] => {
  const sections = [];

  if (!Array.isArray(nodes)) return [];

  for (const node of nodes) {
    if (/^h[23]$/.test(node.name)) {
      const title = getNodeTitle(node);

      if (title) {
        const id = slugify(title);
        node.attributes.id = id;

        sections.push({
          ...node.attributes,
          title,
          children: []
        });
      }
    }

    sections.push(...collectHeadings(node.children, slugify));
  }

  return sections;
};

export const useMarkdoc = (slug: string) => {
  try {
    const filePath = join(`src/docs/${slug}.md`);
    const markdown = readFileSync(filePath, 'utf-8');

    const ast = Markdoc.parse(markdown);
    const content = Markdoc.transform(ast);
    const render = Markdoc.renderers.react(content, React);

    return {
      frontmatter: yaml.load(ast.attributes.frontmatter),
      headings: collectHeadings(content as RenderableTreeNode),
      render
    };
  } catch {
    notFound();
  }
};
