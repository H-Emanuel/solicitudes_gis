from django import template

register = template.Library()

@register.filter
def test_filter(value):
    return "Test: " + str(value)

@register.filter
def dict_get(d, key):
    try:
        return d.get(key)
    except Exception:
        return None