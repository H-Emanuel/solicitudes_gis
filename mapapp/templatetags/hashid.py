from django import template
from hashids import Hashids

register = template.Library()

HASHIDS_SALT = 'cambia_esto_por_un_salt_secreto'
hashids = Hashids(salt=HASHIDS_SALT, min_length=8)

@register.filter
def hashid(value):
    try:
        return hashids.encode(int(value))
    except Exception:
        return ''
