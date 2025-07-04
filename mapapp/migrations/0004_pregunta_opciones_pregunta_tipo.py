# Generated by Django 5.1.7 on 2025-03-20 16:54

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('mapapp', '0003_pregunta_respuesta'),
    ]

    operations = [
        migrations.AddField(
            model_name='pregunta',
            name='opciones',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='pregunta',
            name='tipo',
            field=models.CharField(choices=[('texto', 'Texto'), ('verdadero_falso', 'Verdadero/Falso'), ('opcion_multiple', 'Opción Múltiple')], default='texto', max_length=20),
        ),
    ]
