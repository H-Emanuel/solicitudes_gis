# Generated by Django 5.1.7 on 2025-03-20 14:23

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('mapapp', '0002_punto_direccion_alter_punto_nombre'),
    ]

    operations = [
        migrations.CreateModel(
            name='Pregunta',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('texto', models.TextField()),
            ],
        ),
        migrations.CreateModel(
            name='Respuesta',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('respuesta', models.TextField()),
                ('pregunta', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='mapapp.pregunta')),
                ('punto', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='mapapp.punto')),
            ],
        ),
    ]
