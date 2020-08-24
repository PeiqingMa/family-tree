package me.self.familytree.beans

import io.micronaut.context.annotation.Factory
import io.micronaut.context.annotation.Primary
import org.neo4j.ogm.config.Configuration
import org.neo4j.ogm.session.SessionFactory
import javax.inject.Singleton

@Factory
class TestBeanFactory {

    /**
     * override me.self.familytree.beans.BeanFactory.sessionFactory
     * use embedded Neo4j in test
     */
    @Primary
    @Singleton
    fun sessionFactory(): SessionFactory {
        val packageName = this::class.qualifiedName?.let { it.substring(0, it.lastIndexOf('.')) }
        return SessionFactory(Configuration.Builder().build(), packageName)
    }

}
