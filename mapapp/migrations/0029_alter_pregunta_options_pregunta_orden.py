# Generated by Django 5.1.7 on 2025-05-15 06:28

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('mapapp', '0028_pregunta_fecha_tipo_alter_pregunta_tipo'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='pregunta',
            options={'ordering': ['orden', 'id']},
        ),
        migrations.AddField(
            model_name='pregunta',
            name='orden',
            field=models.PositiveIntegerField(default=0),
        ),
    ]
