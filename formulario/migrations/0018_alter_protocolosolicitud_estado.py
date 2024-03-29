# Generated by Django 3.2.15 on 2023-08-01 20:49

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('formulario', '0017_alter_protocolosolicitud_estado'),
    ]

    operations = [
        migrations.AlterField(
            model_name='protocolosolicitud',
            name='estado',
            field=models.CharField(blank=True, choices=[('EJECUTADO', 'EJECUTADO'), ('RECIBIDO', 'RECIBIDO'), ('EN PROCESO', 'EN PROCESO'), ('RECHAZADO', 'RECHAZADO')], default='RECIBIDO', max_length=100),
        ),
    ]
