from django.db import migrations

def crear_departamentos(apps, schema_editor):
    Departamento = apps.get_model('mapapp', 'Departamento')
    for nombre in ['A', 'B', 'C', 'D', 'E', 'F']:
        Departamento.objects.get_or_create(nombre=nombre)

class Migration(migrations.Migration):
    dependencies = [
        ('mapapp', '0039_departamento_alter_formulario_departamento'),
    ]
    operations = [
        migrations.RunPython(crear_departamentos),
    ]
