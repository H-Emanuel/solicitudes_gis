# Generated by Django 3.2.15 on 2023-10-05 13:24

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('formulario', '0026_alter_protocolosolicitud_estado'),
    ]

    operations = [
        migrations.AlterField(
            model_name='protocolosolicitud',
            name='estado',
            field=models.CharField(blank=True, choices=[('EN PROCESO', 'EN PROCESO'), ('EJECUTADO', 'EJECUTADO'), ('RECIBIDO', 'RECIBIDO'), ('RECHAZADO', 'RECHAZADO')], default='RECIBIDO', max_length=100),
        ),
    ]
