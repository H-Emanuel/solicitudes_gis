# Generated by Django 5.1.7 on 2025-06-11 02:50

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('mapapp', '0037_pregunta_mapa_tipo_geometria'),
    ]

    operations = [
        migrations.AddField(
            model_name='formulario',
            name='departamento',
            field=models.CharField(blank=True, help_text='Departamento al que pertenece el formulario', max_length=100, null=True),
        ),
    ]
