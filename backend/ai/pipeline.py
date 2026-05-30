"""
软通新闻智能整理器 - AI处理Pipeline
使用LLM对新闻进行摘要、分类、关键词提取、情感分析
优化：单次LLM调用完成所有分析，大幅降低延迟和Token消耗
"""
import os
import json
import asyncio
from typing import Optional
from openai import AsyncOpenAI


class AIPipeline:
    """AI处理管线"""

    def __init__(self):
        self.client = self._init_client()

    def _init_client(self) -> Optional[AsyncOpenAI]:
        """初始化LLM客户端"""
        # 1. 科大讯飞 MaaS
        xfyun_key = os.getenv("XFYUN_API_KEY")
        xfyun_base = os.getenv("XFYUN_BASE_URL", "https://maas-coding-api.cn-huabei-1.xf-yun.com/v2")
        if xfyun_key:
            print(f"[AI] 使用科大讯飞 MaaS: {xfyun_base}")
            return AsyncOpenAI(api_key=xfyun_key, base_url=xfyun_base)

        # 2. DeepSeek
        ds_key = os.getenv("DEEPSEEK_API_KEY")
        ds_base = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")
        if ds_key:
            print(f"[AI] 使用DeepSeek: {ds_base}")
            return AsyncOpenAI(api_key=ds_key, base_url=ds_base)

        # 3. OpenRouter
        or_key = os.getenv("OPENROUTER_API_KEY")
        or_base = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
        if or_key:
            print(f"[AI] 使用OpenRouter: {or_base}")
            return AsyncOpenAI(api_key=or_key, base_url=or_base)

        # 4. OpenAI兼容
        oai_key = os.getenv("OPENAI_API_KEY")
        if oai_key:
            base = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
            print(f"[AI] 使用OpenAI兼容: {base}")
            return AsyncOpenAI(api_key=oai_key, base_url=base)

        print("[AI] ⚠️ 未配置任何LLM API Key，AI功能不可用")
        return None

    def _get_model(self) -> str:
        """获取模型名称"""
        return os.getenv("AI_MODEL", "astron-code-latest")

    async def _chat(self, system_prompt: str, user_prompt: str, temperature: float = 0.3) -> Optional[str]:
        """调用LLM"""
        if not self.client:
            return None
        try:
            resp = await self.client.chat.completions.create(
                model=self._get_model(),
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=temperature,
                max_tokens=500,
            )
            return resp.choices[0].message.content.strip()
        except Exception as e:
            print(f"[AI] LLM调用失败: {e}")
            return None

    async def process_article(self, article: dict) -> dict:
        """对单篇新闻进行完整AI处理 - 单次调用完成所有分析"""
        title = article.get("title", "")
        content = article.get("content", "")
        source = article.get("source", "")

        if not content and not title:
            return article

        text = f"标题：{title}\n来源：{source}\n内容：{content[:2000]}"

        categories = "公司动态、产品技术、合作生态、市场拓展、荣誉奖项、财务投资、人才文化、其他"

        system_prompt = """你是新闻分析专家。请对新闻进行综合分析，返回严格JSON格式：
{
  "summary": "2-3句话的摘要，突出关键信息",
  "category": "从以下选择一个：公司动态、产品技术、合作生态、市场拓展、荣誉奖项、财务投资、人才文化、其他",
  "keywords": ["关键词1", "关键词2", "关键词3"],
  "sentiment": "正面/中性/负面",
  "importance": 0.8
}
只返回JSON，不要其他内容。"""

        resp = await self._chat(system_prompt, f"请分析以下新闻：\n\n{text}")

        if resp:
            try:
                # 提取JSON
                import re
                match = re.search(r'\{.*\}', resp, re.DOTALL)
                if match:
                    data = json.loads(match.group())
                    article["summary"] = data.get("summary", article.get("summary", ""))
                    article["category"] = data.get("category", "其他")
                    article["keywords"] = data.get("keywords", [])
                    article["sentiment"] = data.get("sentiment", "中性")
                    score = data.get("importance", 0.5)
                    if isinstance(score, (int, float)):
                        article["importance_score"] = min(max(float(score), 0), 1)
                    return article
            except (json.JSONDecodeError, Exception) as e:
                print(f"[AI] JSON解析失败: {e}, raw: {resp[:200]}")

        # fallback: 尝试部分解析
        return article

    async def process_batch(self, articles: list[dict], concurrency: int = 5) -> list[dict]:
        """批量处理新闻，控制并发数"""
        # 演示环境限制处理数量，避免超时
        max_articles = min(len(articles), 10)
        articles = articles[:max_articles]
        
        total = len(articles)
        processed = []
        semaphore = asyncio.Semaphore(concurrency)

        async def _process_with_semaphore(idx, article):
            async with semaphore:
                print(f"[AI] 处理中 {idx+1}/{total}: {article.get('title', '')[:30]}...")
                try:
                    return await self.process_article(article)
                except Exception as e:
                    print(f"[AI] 处理失败: {e}")
                    return article

        tasks = [_process_with_semaphore(i, a) for i, a in enumerate(articles)]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for result in results:
            if isinstance(result, Exception):
                print(f"[AI] 异常: {result}")
                processed.append(articles[0])
            else:
                processed.append(result)

        print(f"[AI] 批量处理完成: {len(processed)}/{total}")
        return processed

    async def chat(self, question: str, context_articles: list[dict]) -> str:
        """基于新闻上下文的智能问答"""
        if not self.client:
            return "AI服务未配置，无法回答问题。"

        # 构建新闻上下文
        news_context = ""
        for i, a in enumerate(context_articles[:20], 1):
            title = a.get("title", "")
            content = a.get("content", "")
            summary = a.get("summary", "")
            date = a.get("publish_date", "")
            category = a.get("category", "")
            news_context += f"\n【新闻{i}】{title}\n日期：{date} | 分类：{category}\n内容：{content[:300]}\n"
            if summary:
                news_context += f"摘要：{summary}\n"

        system_prompt = """你是软通动力新闻分析助手。基于提供的新闻内容回答用户问题。
要求：
1. 回答要基于新闻事实，不要编造信息
2. 如果新闻中没有相关信息，请诚实说明
3. 回答要条理清晰，适当使用编号列表
4. 可以综合多篇新闻给出分析性回答
5. 用中文回答"""

        user_prompt = f"以下是近30天关于软通动力的新闻：\n{news_context}\n\n用户问题：{question}"

        resp = await self._chat(system_prompt, user_prompt, temperature=0.5)
        return resp or "抱歉，AI暂时无法回答，请稍后再试。"

    async def generate_report(self, context_articles: list[dict]) -> str:
        """生成新闻周报/日报"""
        if not self.client:
            return "AI服务未配置，无法生成报告。"

        news_context = ""
        for i, a in enumerate(context_articles[:25], 1):
            title = a.get("title", "")
            summary = a.get("summary", "") or a.get("content", "")[:150]
            category = a.get("category", "")
            sentiment = a.get("sentiment", "")
            importance = a.get("importance_score", 0.5)
            news_context += f"{i}. [{category}|{sentiment}|重要性{importance}] {title}\n   {summary}\n\n"

        system_prompt = """你是专业的企业新闻分析师。请基于提供的新闻生成一份结构化的周报。
格式要求：
# 软通动力新闻周报

## 一、重大事件速览
（列出3-5条最重要新闻，每条1-2句话）

## 二、业务动态分析
### 1. 产品与技术
### 2. 市场与合作
### 3. 财务与投资

## 三、趋势研判
（基于新闻分析软通动力近期发展趋势）

## 四、风险提示
（如有负面信息或潜在风险）

## 五、关键数据
（提取新闻中的关键数字：营收、增长率、融资额等）

用中文，专业简洁，避免空话。"""

        user_prompt = f"以下是软通动力近30天的新闻：\n\n{news_context}\n\n请生成新闻周报。"

        resp = await self._chat(system_prompt, user_prompt, temperature=0.4)
        return resp or "抱歉，报告生成失败，请稍后再试。"
