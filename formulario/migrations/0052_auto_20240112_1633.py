# Generated by Django 3.2.15 on 2024-01-12 19:33

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('formulario', '0051_auto_20240110_1708'),
    ]

    operations = [
        migrations.AlterField(
            model_name='protocolosolicitud',
            name='direccion',
            field=models.CharField(blank=True, choices=[('Dirección de Desarrollo Cultural', 'Dirección de Desarrollo Cultural'), ('Dirección de Operaciones', 'Dirección de Operaciones'), ('Dirección de Administración y Finaza', 'Dirección de Administración y Finaza'), ('SECPLA', 'SECPLA'), ('Dirección desarrollo Económico y Cooperación Internacional', 'Dirección desarrollo Económico y Cooperación Internacional'), ('', ''), ('Dirección de Género, Mujeres y Diversidades', 'Dirección de Género, Mujeres y Diversidades'), ('Dirección de Tránsito y Transporte públicos', 'Dirección de Tránsito y Transporte públicos'), ('Dirección de Medioambiente', 'Dirección de Medioambiente'), ('Dirección de Vivienda, Barrio y Territorio', 'Dirección de Vivienda, Barrio y Territorio'), ('Dirección de Obras Municipales', 'Dirección de Obras Municipales'), ('Dirección de Desarrollo Comunitario', 'Dirección de Desarrollo Comunitario'), ('Dirección de Seguridad Ciudadana', 'Dirección de Seguridad Ciudadana')], default='', max_length=100),
        ),
        migrations.AlterField(
            model_name='protocolosolicitud',
            name='estado',
            field=models.CharField(blank=True, choices=[('RECHAZADO', 'RECHAZADO'), ('EJECUTADO', 'EJECUTADO'), ('RECIBIDO', 'RECIBIDO'), ('EN PROCESO', 'EN PROCESO')], default='RECIBIDO', max_length=100),
        ),
    ]