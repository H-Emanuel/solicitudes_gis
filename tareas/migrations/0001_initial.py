# Generated by Django 5.1.6 on 2025-02-12 20:15

import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Apoyo',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nombre', models.CharField(max_length=100)),
                ('descripcion', models.TextField()),
            ],
        ),
        migrations.CreateModel(
            name='Funcionario',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nombre', models.CharField(max_length=100)),
                ('apellido', models.CharField(max_length=100)),
                ('cargo', models.CharField(max_length=100)),
            ],
        ),
        migrations.CreateModel(
            name='Tarea',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('descripcion', models.CharField(max_length=200)),
                ('fecha_creacion', models.DateField(auto_now_add=True)),
                ('fecha_entrega', models.DateTimeField(default=django.utils.timezone.now)),
                ('completada', models.BooleanField(default=False)),
                ('prioridad', models.CharField(choices=[('alta', 'Alta'), ('media', 'Media'), ('baja', 'Baja')], default='media', help_text='Seleccione la prioridad de la tarea.', max_length=10)),
                ('apoyo', models.ManyToManyField(blank=True, to='tareas.apoyo')),
                ('funcionario', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='tareas.funcionario')),
            ],
        ),
    ]
