# Generated by Django 3.2.15 on 2025-06-16 16:55

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0005_departamento_departamentoseleccionado_visita'),
    ]

    operations = [
        migrations.CreateModel(
            name='UserActivity1',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('page', models.CharField(max_length=100)),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('departamento', models.CharField(max_length=100)),
            ],
        ),
    ]
