"""
SDK 代码优化服务
提供代码压缩、语法检查、模块化支持
"""

import re
import json
from typing import Dict, Any, Optional
from loguru import logger


class SDKOptimizer:
    """SDK 代码优化器"""

    @staticmethod
    def minify_js(js_code: str) -> str:
        """
        压缩 JavaScript 代码
        移除注释、多余空格、换行
        """
        if not js_code or not js_code.strip():
            return js_code

        try:
            # 1. 移除单行注释 (// ...)
            code = re.sub(r'//.*$', '', js_code, flags=re.MULTILINE)

            # 2. 移除多行注释 (/* ... */)
            code = re.sub(r'/\*.*?\*/', '', code, flags=re.DOTALL)

            # 3. 移除多余空白字符
            code = re.sub(r'\s+', ' ', code)

            # 4. 移除行首行尾空格
            code = code.strip()

            # 5. 优化：在特定字符后添加换行（提高可读性）
            code = re.sub(r';\s*', ';\n', code)
            code = re.sub(r'\{\s*', '{ ', code)
            code = re.sub(r'\}\s*', ' }', code)

            logger.info(f"[SDKOptimizer] JS 压缩完成: {len(js_code)} -> {len(code)} 字符")
            return code

        except Exception as e:
            logger.error(f"[SDKOptimizer] JS 压缩失败: {e}")
            return js_code

    @staticmethod
    def minify_css(css_code: str) -> str:
        """
        压缩 CSS 代码
        移除注释、多余空格
        """
        if not css_code or not css_code.strip():
            return css_code

        try:
            # 1. 移除注释 (/* ... */)
            code = re.sub(r'/\*.*?\*/', '', css_code, flags=re.DOTALL)

            # 2. 移除多余空白
            code = re.sub(r'\s+', ' ', code)

            # 3. 移除选择器后的空格
            code = re.sub(r'\s*\{\s*', '{', code)
            code = re.sub(r'\s*\}\s*', '}', code)

            # 4. 移除属性后的空格
            code = re.sub(r'\s*:\s*', ':', code)
            code = re.sub(r'\s*;\s*', ';', code)

            # 5. 移除最后一个分号
            code = re.sub(r';\}', '}', code)

            logger.info(f"[SDKOptimizer] CSS 压缩完成: {len(css_code)} -> {len(code)} 字符")
            return code.strip()

        except Exception as e:
            logger.error(f"[SDKOptimizer] CSS 压缩失败: {e}")
            return css_code

    @staticmethod
    def minify_html(html_code: str) -> str:
        """
        压缩 HTML 代码
        移除注释、多余空格
        """
        if not html_code or not html_code.strip():
            return html_code

        try:
            # 1. 移除 HTML 注释 (<!-- ... -->)
            code = re.sub(r'<!--.*?-->', '', html_code, flags=re.DOTALL)

            # 2. 移除多余空白（保留标签间的单个空格）
            code = re.sub(r'>\s+<', '><', code)

            # 3. 移除行首行尾空格
            code = re.sub(r'^\s+|\s+$', '', code, flags=re.MULTILINE)

            logger.info(f"[SDKOptimizer] HTML 压缩完成: {len(html_code)} -> {len(code)} 字符")
            return code.strip()

        except Exception as e:
            logger.error(f"[SDKOptimizer] HTML 压缩失败: {e}")
            return html_code

    @staticmethod
    def check_syntax_js(js_code: str) -> Dict[str, Any]:
        """
        检查 JavaScript 语法
        返回检查结果
        """
        errors = []
        warnings = []

        try:
            # 检查常见的语法错误

            # 1. 检查未闭合的括号
            open_parens = js_code.count('(')
            close_parens = js_code.count(')')
            if open_parens != close_parens:
                errors.append(f"括号不匹配: {open_parens} 开括号, {close_parens} 闭括号")

            # 2. 检查未闭合的花括号
            open_braces = js_code.count('{')
            close_braces = js_code.count('}')
            if open_braces != close_braces:
                errors.append(f"花括号不匹配: {open_braces} 开括号, {close_braces} 闭括号")

            # 3. 检查未闭合的方括号
            open_brackets = js_code.count('[')
            close_brackets = js_code.count(']')
            if open_brackets != close_brackets:
                errors.append(f"方括号不匹配: {open_brackets} 开括号, {close_brackets} 闭括号")

            # 4. 检查字符串引号
            single_quotes = js_code.count("'")
            double_quotes = js_code.count('"')
            # 简单检查（不考虑转义）
            if single_quotes % 2 != 0:
                warnings.append("单引号数量为奇数，可能有未闭合的字符串")
            if double_quotes % 2 != 0:
                warnings.append("双引号数量为奇数，可能有未闭合的字符串")

            # 5. 检查常见的错误模式
            if re.search(r'function\s*\(\s*\)\s*[^\{]', js_code):
                warnings.append("函数定义后缺少花括号")

            if re.search(r'if\s*\([^)]*\)\s*[^\{;]', js_code):
                warnings.append("if 语句后缺少花括号或分号")

            # 6. 检查 eval 使用（安全风险）
            if 'eval(' in js_code:
                warnings.append("使用了 eval()，存在安全风险")

            # 7. 检查 document.write（可能覆盖页面）
            if 'document.write' in js_code:
                warnings.append("使用了 document.write()，可能覆盖整个页面")

            return {
                "valid": len(errors) == 0,
                "errors": errors,
                "warnings": warnings,
                "error_count": len(errors),
                "warning_count": len(warnings)
            }

        except Exception as e:
            logger.error(f"[SDKOptimizer] 语法检查失败: {e}")
            return {
                "valid": False,
                "errors": [f"检查过程出错: {str(e)}"],
                "warnings": [],
                "error_count": 1,
                "warning_count": 0
            }

    @staticmethod
    def optimize_bundle(
        html: str,
        css: str,
        js: str,
        enable_minify: bool = True,
        enable_syntax_check: bool = True
    ) -> Dict[str, Any]:
        """
        优化整个 SDK 包

        Args:
            html: HTML 代码
            css: CSS 代码
            js: JavaScript 代码
            enable_minify: 是否启用压缩
            enable_syntax_check: 是否启用语法检查

        Returns:
            优化结果
        """
        result: Dict[str, Any] = {
            "original_size": {
                "html": len(html),
                "css": len(css),
                "js": len(js),
                "total": len(html) + len(css) + len(js)
            },
            "optimized_size": {},
            "compression_ratio": 0.0,
            "syntax_check": None,
            "html": html,
            "css": css,
            "js": js
        }

        # 语法检查
        if enable_syntax_check:
            result["syntax_check"] = SDKOptimizer.check_syntax_js(js)
            if not result["syntax_check"]["valid"]:
                logger.warning(f"[SDKOptimizer] JavaScript 语法检查失败: {result['syntax_check']['errors']}")

        # 压缩代码
        if enable_minify:
            result["html"] = SDKOptimizer.minify_html(html)
            result["css"] = SDKOptimizer.minify_css(css)
            result["js"] = SDKOptimizer.minify_js(js)

            result["optimized_size"] = {
                "html": len(result["html"]),
                "css": len(result["css"]),
                "js": len(result["js"]),
                "total": len(result["html"]) + len(result["css"]) + len(result["js"])
            }

            # 计算压缩率
            original_total = result["original_size"]["total"]
            optimized_total = result["optimized_size"]["total"]
            if original_total > 0:
                result["compression_ratio"] = round(
                    (1 - optimized_total / original_total) * 100, 2
                )

            logger.info(
                f"[SDKOptimizer] 压缩完成: {original_total} -> {optimized_total} "
                f"({result['compression_ratio']}% 减少)"
            )
        else:
            result["optimized_size"] = result["original_size"]

        return result


# 全局优化器实例
_optimizer: Optional[SDKOptimizer] = None


def get_optimizer() -> SDKOptimizer:
    """获取优化器实例"""
    global _optimizer
    if _optimizer is None:
        _optimizer = SDKOptimizer()
    return _optimizer
