# Generated by Django 5.1.7 on 2025-04-08 03:38

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('mapapp', '0016_remove_imagenrespuesta_pregunta_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='Formulario',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nombre', models.CharField(max_length=100)),
                ('descripcion', models.TextField(blank=True, null=True)),
                ('fecha_creacion', models.DateTimeField(auto_now_add=True)),
            ],
        ),
        migrations.AddField(
            model_name='pregunta',
            name='formulario',
            field=models.ForeignKey(default=1, on_delete=django.db.models.deletion.CASCADE, related_name='preguntas', to='mapapp.formulario'),
            preserve_default=False,
        ),
    ]
