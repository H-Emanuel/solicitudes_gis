# Generated by Django 3.2.15 on 2024-05-07 21:29

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('control_creacion_usuario', '0002_auto_20240506_1656'),
    ]

    operations = [
        migrations.AddField(
            model_name='pdf_sig',
            name='nombre',
            field=models.TextField(default='a'),
            preserve_default=False,
        ),
    ]
