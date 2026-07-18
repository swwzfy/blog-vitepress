<?xml version="1.0" encoding="UTF-8"?>
<!--
  RSS XSL 样式表：当浏览器直接打开 .rss 文件时，自动套用本样式渲染。
  RSS 阅读器订阅不受影响，仍按 XML 解析 feed。
-->
<xsl:stylesheet version="1.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:atom="http://www.w3.org/2005/Atom"
                xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"
              doctype-system="about:legacy-compat"/>

  <xsl:template match="/">
    <html lang="zh-CN">
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width,initial-scale=1"/>
        <title>RSS · <xsl:value-of select="/rss/channel/title"/></title>
        <style>
          :root { color-scheme: light dark; }
          body { font: 16px/1.7 -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
                 max-width: 760px; margin: 40px auto; padding: 0 24px;
                 color: #1a1a2e; background: #fafafc; }
          @media (prefers-color-scheme: dark) {
            body { color: #e6e6f0; background: #0f0f1a; }
            a { color: #a29bfe; }
            code { background: #2a2a3e; color: #fd79a8; }
            .entry { border-color: #2a2a3e; }
          }
          h1 { font-size: 28px; font-weight: 800; margin-bottom: 8px;
               background: linear-gradient(135deg, #6c5ce7, #fd79a8);
               -webkit-background-clip: text; -webkit-text-fill-color: transparent;
               background-clip: text; }
          .desc { color: #6c6c80; font-size: 14px; margin-top: 4px; }
          .meta-bar { display: flex; gap: 12px; flex-wrap: wrap; align-items: center;
                      background: rgba(108,92,231,0.08); border-radius: 12px;
                      padding: 14px 18px; margin: 24px 0; font-size: 14px; }
          .meta-bar code { background: rgba(108,92,231,0.18); padding: 4px 10px;
                           border-radius: 6px; font-family: ui-monospace, "JetBrains Mono", Consolas, monospace; }
          .meta-bar button { background: #6c5ce7; color: white; border: 0;
                             padding: 6px 14px; border-radius: 6px; cursor: pointer;
                             font-size: 13px; font-weight: 600; }
          .meta-bar button:hover { background: #5a4cd0; }
          ol.entries { list-style: none; padding: 0; }
          .entry { border-top: 1px solid #e6e6ea; padding: 28px 0; }
          .entry h2 { font-size: 20px; margin: 0 0 8px 0; line-height: 1.4; }
          .entry h2 a { color: inherit; text-decoration: none; }
          .entry h2 a:hover { color: #6c5ce7; }
          time { color: #888; font-size: 13px; font-variant-numeric: tabular-nums; }
          .entry .tags { display: flex; gap: 6px; flex-wrap: wrap; margin: 10px 0 14px; }
          .entry .tag { font-size: 12px; background: rgba(108,92,231,0.15);
                         color: #6c5ce7; padding: 2px 10px; border-radius: 12px;
                         font-weight: 500; }
          .entry .content { line-height: 1.7; margin-top: 12px; }
          .entry .content p { margin: 12px 0; }
          .entry .content h1, .entry .content h2, .entry .content h3 { margin-top: 28px; margin-bottom: 12px; line-height: 1.3; }
          .entry .content h1 { font-size: 22px; }
          .entry .content h2 { font-size: 18px; }
          .entry .content code { background: rgba(108,92,231,0.12); color: #6c5ce7;
                                  padding: 2px 6px; border-radius: 4px; font-size: 0.92em; }
          .entry .content pre { background: #1f1f2e; color: #e6e6f0; padding: 16px;
                                 border-radius: 8px; overflow-x: auto; margin: 16px 0;
                                 font-family: ui-monospace, "JetBrains Mono", Consolas, monospace; font-size: 13px; line-height: 1.5; }
          .entry .content pre code { background: transparent; color: inherit;
                                       padding: 0; }
          .entry .content blockquote { background: rgba(108,92,231,0.08);
                                         border-left: 3px solid #6c5ce7; padding: 12px 16px;
                                         border-radius: 0 8px 8px 0; color: #555; margin: 16px 0; }
          .entry .content img { max-width: 100%; border-radius: 8px; }
          .entry .content ul, .entry .content ol { padding-left: 24px; }
          .desc { margin-bottom: 6px; }
        </style>
      </head>
      <body>
        <header>
          <h1><xsl:value-of select="/rss/channel/title"/></h1>
          <p class="desc"><xsl:value-of select="/rss/channel/description"/></p>
          <div class="meta-bar">
            <code><xsl:value-of select="/rss/channel/link"/></code>
            <button onclick="navigator.clipboard.writeText(this.previousElementSibling.textContent).then(() => this.textContent = '已复制')">
              复制
            </button>
            <span>语言: <xsl:value-of select="/rss/channel/language"/> · 共 <xsl:value-of select="count(/rss/channel/item)"/> 篇</span>
          </div>
        </header>

        <ol class="entries">
          <xsl:for-each select="/rss/channel/item">
            <li class="entry">
              <h2>
                <a hreflang="zh-CN">
                  <xsl:attribute name="href"><xsl:value-of select="link"/></xsl:attribute>
                  <xsl:value-of select="title"/>
                </a>
              </h2>
              <time><xsl:value-of select="pubDate"/></time>

              <xsl:if test="category">
                <div class="tags">
                  <xsl:for-each select="category">
                    <span class="tag"><xsl:value-of select="."/></span>
                  </xsl:for-each>
                </div>
              </xsl:if>

              <xsl:if test="description">
                <p class="desc"><xsl:value-of select="description"/></p>
              </xsl:if>

              <div class="content">
                <xsl:copy-of select="content:encoded/node()"/>
              </div>
            </li>
          </xsl:for-each>
        </ol>

        <footer style="margin-top: 60px; padding: 24px 0; border-top: 1px solid #e6e6ea; color: #888; font-size: 13px; text-align: center;">
          <p>通过 RSS 订阅 · RSS 阅读器（如 Feedly / NetNewsWire / Inoreader）粘贴上方链接即可订阅</p>
        </footer>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
