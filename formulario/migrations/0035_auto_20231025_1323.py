# Generated by Django 3.2.15 on 2023-10-25 16:23

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('formulario', '0034_auto_20231024_1736'),
    ]

    operations = [
        migrations.AlterField(
            model_name='protocolosolicitud',
            name='direccion',
            field=models.CharField(blank=True, choices=[('', ''), ('Dirección de Desarrollo Comunitario', 'Dirección de Desarrollo Comunitario'), ('Dirección de Medioambiente', 'Dirección de Medioambiente'), ('Dirección de Desarrollo Cultural', 'Dirección de Desarrollo Cultural'), ('Dirección de Género, Mujeres y Diversidades', 'Dirección de Género, Mujeres y Diversidades'), ('SECPLAN', 'SECPLAN'), ('Dirección de Obras Municipales', 'Dirección de Obras Municipales'), ('Dirección desarrollo Económico y Cooperación Internacional', 'Dirección desarrollo Económico y Cooperación Internacional'), ('Dirección de Tránsito y Transporte públicos', 'Dirección de Tránsito y Transporte públicos'), ('Dirección de Vivienda, Barrio y Territorio', 'Dirección de Vivienda, Barrio y Territorio'), ('Dirección de Operaciones', 'Dirección de Operaciones'), ('Dirección de Administración y Finaza', 'Dirección de Administración y Finaza'), ('Dirección de Seguridad Ciudadana', 'Dirección de Seguridad Ciudadana')], default='', max_length=100),
        ),
        migrations.AlterField(
            model_name='protocolosolicitud',
            name='estado',
            field=models.CharField(blank=True, choices=[('RECIBIDO', 'RECIBIDO'), ('EN PROCESO', 'EN PROCESO'), ('RECHAZADO', 'RECHAZADO'), ('EJECUTADO', 'EJECUTADO')], default='RECIBIDO', max_length=100),
        ),
    ]
